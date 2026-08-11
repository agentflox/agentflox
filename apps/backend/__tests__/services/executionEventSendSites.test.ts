/**
 * Static regression: every non-root inngest.send of agent/execute or
 * tool/composite.execute must stamp rootRunId (nested safety).
 *
 * Run: pnpm --filter service-server exec jest executionEventSendSites
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../../src');

const EVENT_NAMES = ['agent/execute', 'tool/composite.execute'] as const;

/** Known root HTTP/controller triggers — may omit billingExempt. */
const ROOT_SEND_FILES = new Set([
  path.normalize('controllers/tools.controller.ts'),
  path.normalize('controllers/agents.controller.ts'),
]);

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'generated') continue;
      walkTsFiles(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** Find send payloads that name the target event and check for rootRunId nearby. */
function findEventSends(source: string, eventName: string): Array<{ line: number; hasRootRunId: boolean; snippet: string }> {
  const results: Array<{ line: number; hasRootRunId: boolean; snippet: string }> = [];
  const lines = source.split(/\r?\n/);
  const eventPattern = new RegExp(`name:\\s*['"]${eventName.replace('.', '\\.')}['"]`);

  for (let i = 0; i < lines.length; i++) {
    if (!eventPattern.test(lines[i])) continue;
    // Look at a window around the match for data: { ... rootRunId
    const start = Math.max(0, i - 5);
    const end = Math.min(lines.length, i + 25);
    const window = lines.slice(start, end).join('\n');
    const hasRootRunId = /rootRunId\s*[:,]/.test(window);
    results.push({
      line: i + 1,
      hasRootRunId,
      snippet: lines[i].trim(),
    });
  }
  return results;
}

describe('execution event inngest.send sites', () => {
  const files = walkTsFiles(SRC_ROOT);

  it('discovers at least the known send sites', () => {
    const found: string[] = [];
    for (const file of files) {
      const rel = path.relative(SRC_ROOT, file);
      const src = fs.readFileSync(file, 'utf8');
      for (const eventName of EVENT_NAMES) {
        const sends = findEventSends(src, eventName);
        for (const s of sends) {
          found.push(`${rel}:${s.line} ${eventName}`);
        }
      }
    }
    expect(found.length).toBeGreaterThan(0);
    // Type definitions in lib/inngest.ts also match name: — filter those out conceptually
    const runtime = found.filter((f) => !f.includes('lib/inngest.ts'));
    expect(runtime.some((f) => f.includes('tools.controller'))).toBe(true);
    expect(runtime.some((f) => f.includes('agents.controller'))).toBe(true);
    expect(runtime.some((f) => f.includes('workflowOrchestrator'))).toBe(true);
  });

  it('requires rootRunId on non-root send sites', () => {
    const violations: string[] = [];

    for (const file of files) {
      const rel = path.normalize(path.relative(SRC_ROOT, file));
      if (rel === path.normalize('lib/inngest.ts')) continue; // type defs only

      const src = fs.readFileSync(file, 'utf8');
      for (const eventName of EVENT_NAMES) {
        const sends = findEventSends(src, eventName);
        for (const s of sends) {
          const isRootFile = ROOT_SEND_FILES.has(rel);
          // Root controllers also stamp rootRunId (required for worker dedup) —
          // every site must have it.
          if (!s.hasRootRunId) {
            violations.push(`${rel}:${s.line} missing rootRunId for ${eventName} (${s.snippet})`);
          }
          // Nested (non-root) sites should also set billingExempt when they are
          // children of an already-billed parent. Soft-check: workflowOrchestrator
          // and agentTaskOrchestrator must mention billingExempt in the window.
          if (
            !isRootFile &&
            (rel.includes('workflowOrchestrator') || rel.includes('agentTaskOrchestrator'))
          ) {
            const lines = src.split(/\r?\n/);
            const window = lines.slice(Math.max(0, s.line - 6), s.line + 24).join('\n');
            if (!/billingExempt\s*[:,]/.test(window) && !/rootRunId\s*[:,]/.test(window)) {
              violations.push(`${rel}:${s.line} nested site missing billingExempt/rootRunId`);
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

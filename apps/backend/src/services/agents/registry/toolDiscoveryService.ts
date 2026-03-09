import type { Tool } from '../types/types';

/**
 * Simple semantic-ish tool router.
 *
 * Today this uses lightweight keyword/description overlap to pick relevant tools.
 * The API is designed so we can later swap in a true vector-based semantic router
 * without changing callers.
 */
export class ToolDiscoveryService {
  /**
   * Select a small set of relevant tools for the given message.
   *
   * @param message       User message / task description
   * @param available     All tools the agent can access (names only)
   * @param fetchTool     Callback to resolve a tool definition (name → Tool)
   * @param maxTools      Upper bound on tools to return
   */
  async selectRelevantTools(
    message: string,
    available: string[],
    fetchTool: (name: string) => Promise<Tool | null>,
    maxTools = 5
  ): Promise<string[]> {
    if (!available || available.length === 0) return [];

    const lowerMessage = message.toLowerCase();
    const messageTokens = new Set(
      lowerMessage
        .split(/[^a-z0-9]+/i)
        .map((t) => t.trim())
        .filter(Boolean)
    );

    const scored: Array<{ name: string; score: number }> = [];

    for (const name of available) {
      try {
        const tool = await fetchTool(name);
        if (!tool) continue;

        const description = `${tool.name ?? name} ${tool.description ?? ''}`.toLowerCase();
        const descTokens = new Set(
          description
            .split(/[^a-z0-9]+/i)
            .map((t) => t.trim())
            .filter(Boolean)
        );

        let overlap = 0;
        for (const token of messageTokens) {
          if (descTokens.has(token)) overlap++;
        }

        // Slight boost for exact name mentions
        if (lowerMessage.includes(name.toLowerCase())) {
          overlap += 2;
        }

        // If no overlap at all, still keep a tiny baseline so we can break ties later.
        const score = overlap > 0 ? overlap : 0;
        if (score > 0) {
          scored.push({ name, score });
        }
      } catch {
        // Non-fatal: skip misconfigured tool
      }
    }

    if (scored.length === 0) {
      // Fallback: just return the first N tools to avoid blocking execution.
      return available.slice(0, Math.min(maxTools, available.length));
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.min(maxTools, scored.length)).map((s) => s.name);
  }
}


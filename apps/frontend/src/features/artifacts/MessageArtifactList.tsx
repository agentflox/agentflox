'use client';

import React from 'react';
import { FileText, Image as ImageIcon, Code2, Film, FileWarning } from 'lucide-react';
import type { ExecutionArtifact } from './types';
import { buildArtifactsFromToolResult, normalizeArtifact } from './types';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  markdown: FileText,
  text: FileText,
  code: Code2,
  json: Code2,
  image: ImageIcon,
  video: Film,
  unsupported: FileWarning,
};

/** Normalize raw message/tool artifact payloads into ExecutionArtifact[]. */
export function coerceArtifacts(raw: unknown, toolName = 'agent'): ExecutionArtifact[] {
  if (!Array.isArray(raw)) return [];
  const out: ExecutionArtifact[] = [];
  for (const a of raw) {
    const built = buildArtifactsFromToolResult(toolName, a);
    if (built.length) {
      out.push(...built);
      continue;
    }
    const normalized = normalizeArtifact(a);
    if (normalized) out.push(normalized);
  }
  return out;
}

export type MessageArtifactListProps = {
  artifacts: ExecutionArtifact[];
  onOpen: (artifact: ExecutionArtifact) => void;
  className?: string;
  compact?: boolean;
};

export function MessageArtifactList({
  artifacts,
  onOpen,
  className,
  compact,
}: MessageArtifactListProps) {
  if (!artifacts.length) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {!compact && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Artifacts ({artifacts.length})
        </p>
      )}
      {artifacts.map((artifact, idx) => {
        const Icon = TYPE_ICON[artifact.type] || FileText;
        const key = artifact.id || `${artifact.filename}-${idx}`;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(artifact)}
            className={cn(
              'w-full text-left flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors cursor-pointer shadow-sm',
              compact ? 'px-2.5 py-2' : 'px-3 py-3'
            )}
          >
            <div
              className={cn(
                'rounded-lg bg-zinc-100 flex items-center justify-center shrink-0',
                compact ? 'h-8 w-8' : 'h-9 w-9'
              )}
            >
              <Icon className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-800 truncate">{artifact.filename}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 capitalize">{artifact.type}</p>
              {!compact && artifact.detail ? (
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{artifact.detail}</p>
              ) : !compact && artifact.content ? (
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 font-mono">
                  {artifact.content.slice(0, 120)}
                </p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

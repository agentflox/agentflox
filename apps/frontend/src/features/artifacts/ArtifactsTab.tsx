'use client';

import React from 'react';
import { FileText, Image as ImageIcon, Code2, Film, FileWarning } from 'lucide-react';
import type { ExecutionArtifact } from './types';
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

export type ArtifactsTabProps = {
  artifacts: ExecutionArtifact[];
  onOpen: (artifact: ExecutionArtifact) => void;
  emptyLabel?: string;
  className?: string;
};

export function ArtifactsTab({
  artifacts,
  onOpen,
  emptyLabel = 'No artifacts yet',
  className,
}: ArtifactsTabProps) {
  if (!artifacts.length) {
    return (
      <div className={cn('flex h-full items-center justify-center text-sm text-zinc-400', className)}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn('h-full overflow-y-auto p-4 space-y-2', className)}>
      {artifacts.map((artifact, idx) => {
        const Icon = TYPE_ICON[artifact.type] || FileText;
        const key = artifact.id || `${artifact.filename}-${idx}`;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(artifact)}
            className="w-full text-left flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors cursor-pointer shadow-sm"
          >
            <div className="h-9 w-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-800 truncate">{artifact.filename}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 capitalize">{artifact.type}</p>
              {artifact.detail ? (
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{artifact.detail}</p>
              ) : artifact.content ? (
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 font-mono">
                  {artifact.content.slice(0, 120)}
                </p>
              ) : artifact.url ? (
                <p className="text-[11px] text-zinc-500 mt-1 truncate font-mono">{artifact.url}</p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

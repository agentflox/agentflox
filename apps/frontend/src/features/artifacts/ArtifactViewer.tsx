'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Files, X, Copy } from 'lucide-react';
import type { ExecutionArtifact } from './types';

export type ArtifactViewerProps = {
  artifact: ExecutionArtifact;
  onClose: () => void;
  className?: string;
};

function displayTitle(artifact: ExecutionArtifact): string {
  return artifact.filename
    .replace(/-/g, ' ')
    .replace(/\.(md|txt|json|png|mp4)$/i, '')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ArtifactViewer({ artifact, onClose, className }: ArtifactViewerProps) {
  const copyable =
    artifact.type === 'image' || artifact.type === 'video'
      ? artifact.url || ''
      : artifact.content || '';

  return (
    <div
      className={
        className ||
        'w-[480px] border-l border-zinc-200 bg-white flex flex-col shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] transition-all animate-in slide-in-from-right relative z-20 shrink-0 h-full'
      }
    >
      <div className="flex-none h-12 flex items-center justify-between px-4 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2 min-w-0">
          <Files className="h-4 w-4 text-indigo-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-zinc-800 truncate block">{displayTitle(artifact)}</span>
            <span className="text-[11px] text-zinc-400 font-mono truncate block">
              {artifact.filename}
              {artifact.type ? ` · ${artifact.type}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {copyable ? (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(copyable)}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded transition-colors cursor-pointer"
              title="Copy"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
        {artifact.type === 'image' && artifact.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artifact.url} alt={artifact.detail || artifact.filename} className="max-w-full rounded-lg border border-zinc-200" />
        ) : artifact.type === 'video' && artifact.url ? (
          <video src={artifact.url} controls className="max-w-full rounded-lg border border-zinc-200" />
        ) : artifact.type === 'unsupported' ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {artifact.detail || 'This artifact cannot be displayed (media has no hosted URL).'}
          </p>
        ) : artifact.type === 'code' || artifact.type === 'json' ? (
          <pre className="text-xs font-mono bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
            {artifact.content}
          </pre>
        ) : (
          <div className="prose prose-sm max-w-none text-zinc-800 prose-headings:text-zinc-900 prose-headings:font-bold prose-p:text-zinc-700 prose-li:text-zinc-700 prose-strong:text-zinc-900 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
            <ReactMarkdown>{artifact.content || ''}</ReactMarkdown>
          </div>
        )}
        {artifact.detail && (artifact.type === 'image' || artifact.type === 'video') ? (
          <p className="mt-3 text-xs text-zinc-500">{artifact.detail}</p>
        ) : null}
      </div>
    </div>
  );
}
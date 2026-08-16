'use client';

import { Card, CardContent } from '@/components/ui/card';

export type IntegrationToolItem = {
  actionId: string;
  displayName: string;
  description: string;
  verified?: boolean;
  toolName?: string;
};

type IntegrationToolsListProps = {
  tools: IntegrationToolItem[];
};

export function IntegrationToolsList({ tools }: IntegrationToolsListProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">
        Tools{tools.length > 0 ? ` (${tools.length})` : ''}
      </h3>
      {tools.length === 0 ? (
        <p className="text-sm text-zinc-500">No tools registered for this provider yet.</p>
      ) : (
        <div className="space-y-2">
          {tools.map((tool) => (
            <Card key={tool.actionId} className="border-zinc-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900">{tool.displayName}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{tool.description}</div>
                    {tool.toolName && (
                      <div className="text-[11px] font-mono text-zinc-400 mt-1 truncate">
                        {tool.toolName}
                      </div>
                    )}
                  </div>
                  {tool.verified === false && (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      Beta
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { IntegrationProviderIcon } from './IntegrationProviderIcon';
import { IntegrationAccountPicker } from './IntegrationAccountPicker';
import { IntegrationToolsList, type IntegrationToolItem } from './IntegrationToolsList';
import { ConnectionSetupContent } from './ConnectionSetupContent';
import { ConnectionCompleteContent } from './ConnectionCompleteContent';
import { UI_TO_CATALOG_PROVIDER } from '../catalogMapping';
import { connectIntegrationProvider } from '../lib/oauthPopup';
import { trpc } from '@/lib/trpc';

/**
 * Superset account shape — accepts both the generic catalog format
 * (primaryLabel / secondaryLabel) and GitHub's native format
 * (login / htmlUrl) so callers don't need an adapter.
 */
export type IntegrationAccount = {
  id: string;
  providerAccountId?: string;
  /** Generic display name OR GitHub login */
  primaryLabel?: string;
  login?: string | null;
  /** Generic secondary label OR GitHub profile URL */
  secondaryLabel?: string | null;
  htmlUrl?: string | null;
  avatarUrl?: string | null;
};

/** Backwards-compat alias — previously exported from GitHubConfigDialog */
export type GitHubAccount = IntegrationAccount;

type IntegrationConnectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uiProvider: string | null;
  displayName?: string;
  description?: string;
  isConnected?: boolean;
  verified?: boolean;
  beta?: boolean;
  accounts?: IntegrationAccount[];
  tools?: IntegrationToolItem[];
  onDisconnected?: () => void;
  onConnected?: () => void;
};

const CONNECTABLE = new Set(['github', 'slack', 'gmail', 'google_calendar', 'google_drive']);

type DialogView = 'manage' | 'setup' | 'complete';

export function IntegrationConnectDialog({
  open,
  onOpenChange,
  uiProvider,
  displayName,
  description,
  isConnected: _isConnected,
  accounts = [],
  tools = [],
  onDisconnected,
  onConnected,
}: IntegrationConnectDialogProps) {
  const [connecting, setConnecting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [view, setView] = useState<DialogView>('manage');
  const [oauthStatus, setOauthStatus] = useState<'connecting' | 'timeout' | 'idle'>('idle');

  const catalogId = useMemo(
    () => (uiProvider ? UI_TO_CATALOG_PROVIDER[uiProvider] ?? uiProvider : null),
    [uiProvider],
  );

  const disconnectOAuth = trpc.integration.oauthDisconnect.useMutation({
    onSuccess: () => {
      toast.success('Account disconnected');
      onDisconnected?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect');
    },
  });

  const syncVault = trpc.integration.syncVault.useMutation();

  const pickerAccounts = useMemo(
    () =>
      accounts.map((account) => ({
        id: account.id,
        // Accept both generic (primaryLabel) and GitHub-native (login) field names
        primaryLabel:
          account.primaryLabel ||
          account.login ||
          account.providerAccountId ||
          `Account ${account.id.slice(0, 8)}…`,
        // Accept both generic (secondaryLabel) and GitHub-native (htmlUrl) field names
        secondaryLabel: account.secondaryLabel ?? account.htmlUrl ?? null,
        avatarUrl: account.avatarUrl ?? null,
      })),
    [accounts],
  );

  const startOAuth = useCallback(async () => {
    if (!uiProvider || !CONNECTABLE.has(uiProvider)) return;
    setOauthStatus('connecting');
    try {
      const result = await connectIntegrationProvider(uiProvider);
      if (result.ok) {
        await syncVault.mutateAsync().catch(() => undefined);
        toast.success(`${displayName ?? 'Integration'} connected`);
        setView('complete');
        setOauthStatus('idle');
        onConnected?.();
      } else {
        setOauthStatus('timeout');
      }
    } catch {
      setOauthStatus('timeout');
    }
  }, [uiProvider, displayName, syncVault, onConnected]);

  const handleConnect = useCallback(() => {
    setView('setup');
    startOAuth();
  }, [startOAuth]);

  const canConnect = !!uiProvider && CONNECTABLE.has(uiProvider);
  const title = displayName ?? 'Integration';

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setView('manage');
        setOauthStatus('idle');
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          view === 'manage'
            ? 'sm:max-w-[820px] max-w-[820px] max-h-[90vh] overflow-y-auto'
            : 'sm:max-w-[640px] max-w-[640px] p-0 overflow-hidden'
        }
        showCloseButton
      >
        {view === 'setup' && catalogId && (
          <>
            <div className="flex items-center gap-1.5 px-5 pt-4 pb-2 text-xs text-zinc-500 border-b">
              <span className="text-zinc-400">App Center</span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-600 font-medium">{title}</span>
              <span className="text-zinc-300">/</span>
              <span className="font-semibold text-zinc-800">Setup</span>
            </div>
            <ConnectionSetupContent
              provider={catalogId}
              displayName={title}
              status={oauthStatus}
              onRetry={startOAuth}
              onCancel={() => setView('manage')}
              onNext={() => setView('complete')}
            />
          </>
        )}

        {view === 'complete' && catalogId && (
          <>
            <div className="flex items-center gap-1.5 px-5 pt-4 pb-2 text-xs text-zinc-500 border-b">
              <span className="text-zinc-400">App Center</span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-600 font-medium">{title}</span>
              <span className="text-zinc-300">/</span>
              <span className="font-semibold text-zinc-800">Done</span>
            </div>
            <ConnectionCompleteContent
              provider={catalogId}
              displayName={title}
              onDone={() => setView('manage')}
              footerNote="Agentflox doesn't allow model providers to train on your data."
            />
          </>
        )}

        {view === 'manage' && (
          <>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-white p-2">
                {catalogId && <IntegrationProviderIcon providerId={catalogId} size={36} />}
              </div>
              <div className="flex-1">
                <DialogHeader className="space-y-1">
                  <DialogTitle>{title}</DialogTitle>
                  <DialogDescription>
                    {description ??
                      `Connect your account to use ${title} in agents, tools, and workflows.`}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-6">
              <Card className="border-zinc-200">
                <CardContent className="p-4 space-y-3">
                  <IntegrationAccountPicker
                    accounts={pickerAccounts}
                    selectedAccountId={selectedAccountId}
                    onSelectAccount={setSelectedAccountId}
                    onConnect={handleConnect}
                    onDisconnect={(accountId) => disconnectOAuth.mutate({ accountId })}
                    isConnecting={connecting}
                    isConnected={pickerAccounts.length > 0}
                    singleAccountOnly={uiProvider === 'github'}
                    providerIcon={
                      catalogId ? <IntegrationProviderIcon providerId={catalogId} size={16} /> : undefined
                    }
                    emptyLabel={`No ${title} account linked`}
                  />

                  {!canConnect && (
                    <p className="text-sm text-zinc-500">
                      OAuth connect for this provider is coming soon.
                    </p>
                  )}
                </CardContent>
              </Card>

              <IntegrationToolsList tools={tools} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

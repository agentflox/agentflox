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
import { UI_TO_CATALOG_PROVIDER } from '../catalogMapping';
import { connectIntegrationProvider } from '../lib/oauthPopup';
import { trpc } from '@/lib/trpc';

type IntegrationConnectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uiProvider: string | null;
  displayName?: string;
  description?: string;
  isConnected?: boolean;
  verified?: boolean;
  beta?: boolean;
  accounts?: Array<{
    id: string;
    providerAccountId?: string;
    primaryLabel?: string;
    secondaryLabel?: string | null;
    avatarUrl?: string | null;
  }>;
  tools?: IntegrationToolItem[];
  onDisconnected?: () => void;
  onConnected?: () => void;
};

const CONNECTABLE = new Set(['github', 'slack', 'gmail', 'google_calendar', 'google_drive']);

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
        primaryLabel:
          account.primaryLabel ||
          account.providerAccountId ||
          `Account ${account.id.slice(0, 8)}…`,
        secondaryLabel: account.secondaryLabel ?? null,
        avatarUrl: account.avatarUrl ?? null,
      })),
    [accounts],
  );

  const handleConnect = useCallback(async () => {
    if (!uiProvider || !CONNECTABLE.has(uiProvider)) return;
    setConnecting(true);
    try {
      const result = await connectIntegrationProvider(uiProvider);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${displayName ?? 'Integration'} connected`);
      await syncVault.mutateAsync().catch(() => undefined);
      onConnected?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  }, [uiProvider, displayName, syncVault, onConnected]);

  const canConnect = !!uiProvider && CONNECTABLE.has(uiProvider);
  const title = displayName ?? 'Integration';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-w-[820px] max-h-[90vh] overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
}

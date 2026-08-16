'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lock,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';

export type IntegrationAccountPickerAccount = {
  id: string;
  primaryLabel: string;
  secondaryLabel?: string | null;
  avatarUrl?: string | null;
};

type IntegrationAccountPickerProps = {
  accounts: IntegrationAccountPickerAccount[];
  selectedAccountId: string | null;
  onSelectAccount: (id: string) => void;
  onConnect: () => void;
  onDisconnect?: (accountId: string) => void;
  isConnecting?: boolean;
  isLoading?: boolean;
  isConnected?: boolean;
  providerIcon?: React.ReactNode;
  connectLabel?: string;
  emptyLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** When true, hide "add another account" once connected (e.g. GitHub). */
  singleAccountOnly?: boolean;
};

function AccountAvatar({
  account,
  icon,
  size = 'md',
}: {
  account?: IntegrationAccountPickerAccount | null;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-9 h-9 text-sm';

  if (account?.avatarUrl) {
    return (
      <img
        src={account.avatarUrl}
        alt={account.primaryLabel}
        className={cn(dim, 'rounded-full object-cover shrink-0')}
      />
    );
  }

  if (icon) {
    return (
      <div className={cn(dim, 'rounded-lg border bg-white flex items-center justify-center shrink-0')}>
        {icon}
      </div>
    );
  }

  const initial = (account?.primaryLabel || '?').charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        dim,
        'rounded-full bg-zinc-900 text-white flex items-center justify-center font-medium shrink-0',
      )}
    >
      {initial}
    </div>
  );
}

function AccountRow({
  account,
  icon,
  selected,
  onClick,
}: {
  account: IntegrationAccountPickerAccount;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-50 cursor-pointer',
        selected && 'bg-zinc-50',
      )}
    >
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-lg border bg-white flex items-center justify-center">
          {icon ?? <Lock className="w-4 h-4 text-zinc-700" />}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
          <Check className="h-2.5 w-2.5" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-900">{account.primaryLabel}</div>
        {account.secondaryLabel && (
          <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
            <AccountAvatar account={account} size="sm" />
            <span className="truncate text-xs text-zinc-500">{account.secondaryLabel}</span>
          </div>
        )}
      </div>
      {selected && <Check className="h-4 w-4 shrink-0 text-zinc-900" />}
    </button>
  );
}

/**
 * Card shown when there is no linked account yet.
 * Matches the "Create a personal connection" design:
 * lock icon + title/subtitle on the left, solid Connect button on the right.
 */
function EmptyConnectionCard({
  icon,
  title,
  description,
  isConnecting,
  onConnect,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  isConnecting: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
          {icon ?? <Lock className="h-4 w-4 text-zinc-900" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900">{title}</div>
          <div className="truncate text-xs text-zinc-500">{description}</div>
        </div>
      </div>

      <Button
        type="button"
        className="shrink-0 gap-2 bg-zinc-900 text-white hover:bg-zinc-800"
        disabled={isConnecting}
        onClick={onConnect}
      >
        {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
        Connect
      </Button>
    </div>
  );
}

function SelectedAccountGlyph({
  account,
  icon,
}: {
  account?: IntegrationAccountPickerAccount | null;
  icon?: React.ReactNode;
}) {
  if (account?.avatarUrl) {
    return (
      <img
        src={account.avatarUrl}
        alt=""
        className="h-[32px] w-[32px] shrink-0 rounded-full object-cover"
      />
    );
  }

  if (account?.secondaryLabel) {
    return (
      <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-medium text-white">
        {account.secondaryLabel.charAt(0).toUpperCase()}
      </span>
    );
  }

  return <>{icon ?? <Lock className="h-4 w-4 text-zinc-700" />}</>;
}

export function IntegrationAccountPicker({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onConnect,
  onDisconnect,
  isConnecting = false,
  isLoading = false,
  isConnected: _isConnected = false,
  providerIcon,
  connectLabel = 'Connect another account',
  emptyLabel: _emptyLabel = 'No account linked',
  emptyTitle = 'Create a personal connection',
  emptyDescription = 'A connection only for you.',
  singleAccountOnly = false,
}: IntegrationAccountPickerProps) {
  const selectedAccount = useMemo(() => {
    if (selectedAccountId) {
      const found = accounts.find((a) => a.id === selectedAccountId);
      if (found) return found;
    }
    return accounts[0] ?? null;
  }, [accounts, selectedAccountId]);

  const effectiveSelectedId = selectedAccount?.id ?? null;
  const hasAnyAccount = accounts.length > 0;
  const showConnected = hasAnyAccount;
  const canAddAccount = !singleAccountOnly || !hasAnyAccount;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {hasAnyAccount ? (
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          {singleAccountOnly && accounts.length === 1 ? (
            <div className="flex w-full max-w-[220px] items-center gap-2.5 rounded-lg px-2 py-1.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white shadow-sm">
                <SelectedAccountGlyph account={selectedAccount} icon={providerIcon} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-zinc-900">
                  {selectedAccount?.primaryLabel}
                </span>
                {selectedAccount?.secondaryLabel && (
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-xs text-zinc-500">
                      {selectedAccount.secondaryLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full max-w-[220px] items-center gap-2.5 rounded-lg px-2 py-1.5 pr-3 text-left transition-colors hover:bg-zinc-200/50 cursor-pointer"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white shadow-sm">
                  <SelectedAccountGlyph account={selectedAccount} icon={providerIcon} />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-zinc-900">
                    {selectedAccount?.primaryLabel}
                  </span>

                  {selectedAccount?.secondaryLabel && (
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-xs text-zinc-500">
                        {selectedAccount.secondaryLabel}
                      </span>
                    </div>
                  )}
                </div>

                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 self-center text-zinc-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="z-[200] w-[min(360px,calc(100vw-2rem))] p-2 pointer-events-auto"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Personal
              </p>
              <div className="space-y-0.5">
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    icon={providerIcon}
                    selected={account.id === effectiveSelectedId}
                    onClick={() => onSelectAccount(account.id)}
                  />
                ))}
              </div>
              {canAddAccount && (
                <>
                  <DropdownMenuSeparator className="my-2" />
                  <button
                    type="button"
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </span>
                    Add private connection
                  </button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          {canAddAccount && (
          <button
            type="button"
            disabled={isConnecting}
            onClick={onConnect}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 cursor-pointer"
          >
            {isConnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5 text-zinc-400" />
            )}
            {connectLabel}
          </button>
          )}
        </div>
      ) : (
        <div className="p-3">
          <EmptyConnectionCard
            icon={providerIcon}
            title={emptyTitle}
            description={emptyDescription}
            isConnecting={isConnecting}
            onConnect={onConnect}
          />
        </div>
      )}

      {showConnected && (
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-emerald-50/80 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 fill-emerald-500 text-white" />
            <span className="text-sm font-medium text-emerald-800">Connected</span>
          </div>

          {hasAnyAccount && selectedAccount && onDisconnect && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/60 hover:text-zinc-800 cursor-pointer"
                  aria-label="Account actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  onClick={() => onDisconnect(selectedAccount.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 border-t border-zinc-100 p-3 text-xs text-zinc-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading linked accounts...</span>
        </div>
      )}
    </div>
  );
}
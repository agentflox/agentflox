'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { connectIntegrationProvider } from '@/features/integrations/lib/oauthPopup';
import { trpc } from '@/lib/trpc';
import { IntegrationAccountPicker } from './IntegrationAccountPicker';
import { IntegrationBrandImage } from './IntegrationBrandImage';
import { IntegrationToolsList, type IntegrationToolItem } from './IntegrationToolsList';

export type { IntegrationToolItem };

export interface GitHubAccount {
    id: string;
    providerAccountId: string;
    login: string | null;
    avatarUrl: string | null;
    htmlUrl: string | null;
}

interface GitHubConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    githubAccounts: GitHubAccount[] | undefined;
    isLoadingGithubAccounts: boolean;
    selectedGithubAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onClose: () => void;
    onDisconnect?: (accountId: string) => void;
    isConnected: boolean;
    config?: Record<string, any>;
    onUpdateConfig?: (config: Record<string, any>) => void;
    tools?: IntegrationToolItem[];
}

export const GitHubConfigDialog: React.FC<GitHubConfigDialogProps> = ({
    open,
    onOpenChange,
    githubAccounts,
    isLoadingGithubAccounts,
    selectedGithubAccountId,
    onSelectAccount,
    onClose,
    onDisconnect,
    isConnected,
    config,
    onUpdateConfig,
    tools = [],
}) => {
    const handleOpenChange = useCallback((nextOpen: boolean) => {
        if (!nextOpen) onClose();
        onOpenChange(nextOpen);
    }, [onClose, onOpenChange]);

    const [connectingGithub, setConnectingGithub] = useState(false);
    const syncVault = trpc.integration.syncVault.useMutation();

    const handleConnectGithub = async () => {
        setConnectingGithub(true);
        try {
            const result = await connectIntegrationProvider('github');
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success('GitHub connected');
            await syncVault.mutateAsync().catch(() => undefined);
            onUpdateConfig?.({ ...config });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to connect GitHub');
        } finally {
            setConnectingGithub(false);
        }
    };

    const pickerAccounts = useMemo(
        () =>
            (githubAccounts ?? []).map((account) => ({
                id: account.id,
                primaryLabel: account.login || account.providerAccountId,
                secondaryLabel: account.htmlUrl,
                avatarUrl: account.avatarUrl,
            })),
        [githubAccounts],
    );

    const hasAnyAccount = pickerAccounts.length > 0;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[820px] max-w-[820px] max-h-[90vh] overflow-y-auto">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-white p-2">
                        <IntegrationBrandImage provider="github" size={36} />
                    </div>
                    <div className="flex-1">
                        <DialogHeader className="space-y-1">
                            <DialogTitle>GitHub</DialogTitle>
                            <DialogDescription>
                                Easily view and link GitHub PRs, branches, and more inside Agentflox.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-6">
                    <Card className="border-zinc-200">
                        <CardContent className="p-4">
                            <IntegrationAccountPicker
                                accounts={pickerAccounts}
                                selectedAccountId={selectedGithubAccountId}
                                onSelectAccount={onSelectAccount}
                                onConnect={handleConnectGithub}
                                onDisconnect={onDisconnect}
                                isConnecting={connectingGithub}
                                isLoading={isLoadingGithubAccounts}
                                isConnected={hasAnyAccount}
                                singleAccountOnly
                                providerIcon={<IntegrationBrandImage provider="github" size={16} />}
                                emptyLabel="No GitHub account linked"
                            />
                        </CardContent>
                    </Card>

                    <IntegrationToolsList tools={tools} />
                </div>
            </DialogContent>
        </Dialog>
    );
};

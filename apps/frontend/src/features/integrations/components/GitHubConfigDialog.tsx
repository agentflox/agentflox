'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SignInWithGithub } from '@/services/auth.service';
import { cn } from '@/lib/utils';
import {
    Check,
    ChevronsUpDown,
    X,
    CheckCircle2,
    ChevronDown,
    CircleDot,
    GitBranch,
    Github,
    Loader2,
    Plus,
    Settings,
    Trash2,
    Search,
    Target,
    RefreshCcw,
    Link as LinkIcon,
    PanelRight,
} from "lucide-react";

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
}

const RepoSelector = ({
    selectedRepos,
    onSelect,
    accountId,
}: {
    selectedRepos: Array<{ id: number; full_name: string }>;
    onSelect: (repos: Array<{ id: number; full_name: string }>) => void;
    accountId?: string;
}) => {
    const [open, setOpen] = useState(false);

    // Fetch repos for the selected account (or default to first available if not specified, 
    // but ideally we should pass the account ID to use for fetching)
    // Here we might need to know WHICH account to fetch for. 
    // For workspace settings, maybe we list repos from ALL connected accounts? 
    // Or just let user pick an account to browse?
    // For simplicity, let's use the accountId passed in.

    const { data: repos, isLoading } = trpc.integration.githubListRepos.useQuery(
        { accountId: accountId!, pageSize: 100 },
        { enabled: !!accountId && open }
    );

    const handleSelect = (repo: { id: number; full_name: string }) => {
        if (selectedRepos.some((r) => r.id === repo.id)) {
            onSelect(selectedRepos.filter((r) => r.id !== repo.id));
        } else {
            onSelect([...selectedRepos, repo]);
        }
        setOpen(false);
    };

    const handleRemove = (repoId: number) => {
        onSelect(selectedRepos.filter((r) => r.id !== repoId));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-900">GitHub repositories</div>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-[200px] justify-between"
                            disabled={!accountId}
                        >
                            {accountId ? "Select repositories..." : "Select account first"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="end">
                        <Command>
                            <CommandInput placeholder="Search repositories..." />
                            <CommandList>
                                <CommandEmpty>No repository found.</CommandEmpty>
                                <CommandGroup>
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                                        </div>
                                    ) : (
                                        repos?.map((repo) => (
                                            <CommandItem
                                                key={repo.id}
                                                value={repo.fullName}
                                                onSelect={() => handleSelect({ id: repo.id, full_name: repo.fullName })}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedRepos.some((r) => r.id === repo.id)
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {repo.fullName}
                                            </CommandItem>
                                        ))
                                    )}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="text-xs text-zinc-500">
                Select the repositories you want to search in.
            </div>

            {selectedRepos.length > 0 ? (
                <div className="border rounded-lg divide-y border-zinc-200">
                    <div className="bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 flex items-center justify-between">
                        <span>{selectedRepos.length} selected repositories</span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    {selectedRepos.map((repo) => (
                        <div key={repo.id} className="px-3 py-2 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <Github className="w-4 h-4 text-zinc-400" />
                                <span className="text-zinc-700">{repo.full_name}</span>
                            </div>
                            <button
                                onClick={() => handleRemove(repo.id)}
                                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-sm text-zinc-500 italic">No repositories selected</div>
            )}
        </div>
    );
};

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
}) => {
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) onClose();
        onOpenChange(nextOpen);
    };

    const connectGithubAction = SignInWithGithub.bind(null, "/dashboard/integrations");

    const selectedAccount = useMemo(
        () => githubAccounts?.find((a) => a.id === selectedGithubAccountId) ?? null,
        [githubAccounts, selectedGithubAccountId]
    );

    const [workspaceConnectedSearch, setWorkspaceConnectedSearch] = useState(true);
    const [branchTemplate, setBranchTemplate] = useState(":taskId:_:taskName:_:username:");

    // We'll use local state for repos and sync to server
    const [selectedRepos, setSelectedRepos] = useState<Array<{ id: number; full_name: string }>>(
        (config?.selectedRepos as Array<{ id: number; full_name: string }>) || []
    );

    const updateConfigMutation = trpc.integration.updateIntegrationConfig.useMutation({
        onSuccess: () => {
            toast.success("Settings saved");
            onUpdateConfig?.({ ...config, selectedRepos });
        },
        onError: (err) => {
            toast.error("Failed to save settings: " + err.message);
        }
    });

    const handleSaveRepos = (repos: Array<{ id: number; full_name: string }>) => {
        setSelectedRepos(repos);
        updateConfigMutation.mutate({
            provider: "github",
            config: { ...config, selectedRepos: repos }
        });
    };

    const branchPreview = useMemo(() => {
        const taskId = "ae27d3";
        const taskName = "generated-naming";
        const username = "john-smith";
        return branchTemplate
            .replaceAll(":taskId:", taskId)
            .replaceAll(":taskName:", taskName)
            .replaceAll(":username:", username);
    }, [branchTemplate]);

    const hasAnyAccount = (githubAccounts?.length ?? 0) > 0;
    // We use the passed isConnected prop for workspace connection status

    // For RepoSelector, default to the first account if none selected, or the currently selected one from Personal tab (if shared state)
    // However, selectedGithubAccountId is for Personal tab content.
    // For Workspace repo selection, we just need *an* account. Let's pick the first one.
    const repoFetchAccountId = githubAccounts?.[0]?.id;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[820px] max-w-[820px] max-h-[90vh] overflow-y-auto">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl border bg-white flex items-center justify-center">
                        <Github className="w-7 h-7 text-zinc-900" />
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

                <Tabs defaultValue="personal" className="mt-4">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-transparent p-0 h-auto gap-2">
                            <TabsTrigger
                                value="personal"
                                className="data-[state=active]:shadow-none data-[state=active]:bg-transparent px-0 rounded-none"
                            >
                                Personal {hasAnyAccount ? <span className="ml-1 inline-flex items-center justify-center text-xs rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5">{githubAccounts?.length}</span> : null}
                            </TabsTrigger>
                            <TabsTrigger
                                value="workspace"
                                className="data-[state=active]:shadow-none data-[state=active]:bg-transparent px-0 rounded-none"
                            >
                                Workspace
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="data-[state=active]:shadow-none data-[state=active]:bg-transparent px-0 rounded-none"
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <Separator className="my-4" />

                    <TabsContent value="personal">
                        {/* Personal tab content unchanged */}
                        <div className="space-y-6">
                            <Card className="border-zinc-200">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg border bg-white flex items-center justify-center">
                                                <Github className="w-5 h-5 text-zinc-900" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-zinc-900">
                                                        {selectedAccount?.login || selectedAccount?.providerAccountId || "No account selected"}
                                                    </span>
                                                    {hasAnyAccount && (
                                                        <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {selectedAccount?.htmlUrl ? (
                                                        <a className="hover:underline" href={selectedAccount.htmlUrl} target="_blank" rel="noreferrer">
                                                            {selectedAccount.htmlUrl}
                                                        </a>
                                                    ) : (
                                                        <span>Link a GitHub account to get started</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {hasAnyAccount && selectedAccount && (
                                                <Button
                                                    variant="outline"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 gap-2"
                                                    onClick={() => onDisconnect?.(selectedAccount.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Disconnect
                                                </Button>
                                            )}
                                            <form action={connectGithubAction}>
                                                <Button type="submit" variant="outline" className="gap-2">
                                                    <Plus className="w-4 h-4" />
                                                    {hasAnyAccount ? 'Add Account' : 'Connect'}
                                                </Button>
                                            </form>
                                        </div>
                                    </div>

                                    <div
                                        className={cn(
                                            "rounded-lg border px-3 py-2 flex items-center gap-2",
                                            hasAnyAccount ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-zinc-50"
                                        )}
                                    >
                                        {hasAnyAccount ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                <span className="text-sm font-medium text-emerald-800">Connected</span>
                                            </>
                                        ) : (
                                            <>
                                                <CircleDot className="w-4 h-4 text-zinc-400" />
                                                <span className="text-sm font-medium text-zinc-700">Not connected</span>
                                            </>
                                        )}
                                    </div>

                                    {isLoadingGithubAccounts && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>Loading linked accounts...</span>
                                        </div>
                                    )}

                                    {githubAccounts && githubAccounts.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {githubAccounts.map((account) => (
                                                <button
                                                    key={account.id}
                                                    type="button"
                                                    onClick={() => onSelectAccount(account.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors",
                                                        selectedGithubAccountId === account.id
                                                            ? "border-zinc-900 bg-zinc-900 text-white"
                                                            : "border-zinc-200 hover:border-zinc-300"
                                                    )}
                                                >
                                                    {account.avatarUrl && (
                                                        <img
                                                            src={account.avatarUrl}
                                                            alt={account.login || "GitHub"}
                                                            className="w-5 h-5 rounded-full"
                                                        />
                                                    )}
                                                    <span className="truncate">{account.login || account.providerAccountId}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-zinc-900">Features</h3>
                                <div className="space-y-2">
                                    <Card className="border-zinc-200">
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-zinc-50 border flex items-center justify-center">
                                                <Github className="w-4 h-4 text-zinc-700" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium text-zinc-900">Preview GitHub links</div>
                                                <div className="text-xs text-zinc-500">See synced previews for GitHub objects directly in Agentflox.</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-zinc-200">
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-zinc-50 border flex items-center justify-center">
                                                <GitBranch className="w-4 h-4 text-zinc-700" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium text-zinc-900">Create branches and pull requests</div>
                                                <div className="text-xs text-zinc-500">Quickly create &amp; associate GitHub objects to work items.</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-zinc-900">Commands</h3>
                                <div className="space-y-2">
                                    {[
                                        { title: "Open GitHub", desc: "Quickly launch GitHub with a couple of keystrokes." },
                                        { title: "Create New GitHub Issue", desc: "Fastest way to file a GitHub issue." },
                                        { title: "Create New GitHub Branch", desc: "Create a branch from your workflow." },
                                        { title: "Create New GitHub Pull Request", desc: "Create a PR from a branch." },
                                    ].map((cmd) => (
                                        <Card key={cmd.title} className="border-zinc-200">
                                            <CardContent className="p-4">
                                                <div className="text-sm font-medium text-zinc-900">{cmd.title}</div>
                                                <div className="text-xs text-zinc-500 mt-0.5">{cmd.desc}</div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="workspace">
                        <div className="space-y-6">
                            <Card className={cn("border-zinc-200", isConnected ? "bg-emerald-50 border-emerald-200" : "")}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        {isConnected ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-zinc-900">
                                                    <Github className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-emerald-900">Connected</div>
                                                    <div className="text-xs text-emerald-700">
                                                        {githubAccounts?.find(a => a.id === repoFetchAccountId)?.login || "GitHub Account"}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-sm font-medium text-zinc-900">Create a workspace connection</div>
                                                <div className="text-xs text-zinc-500">A connection for your whole workspace.</div>
                                            </>
                                        )}
                                    </div>
                                    {isConnected ? (
                                        <Button variant="outline" className="h-8 text-xs bg-white text-zinc-700 hover:text-zinc-900 border-emerald-300">
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                            Connected
                                        </Button>
                                    ) : (
                                        <form action={connectGithubAction}>
                                            <Button type="submit" variant="primary">Connect</Button>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-zinc-900">Features</h3>
                                <div className="space-y-2">
                                    <Card className="border-zinc-200">
                                        <CardContent className="p-4 flex items-start gap-4">
                                            <div className="mt-0.5">
                                                <Search className="w-5 h-5 text-zinc-600" />
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <div className="text-sm font-medium text-zinc-900">Workspace Connected Search</div>
                                                        <div className="text-xs text-zinc-500">Enable workspace members to search for only public files from GitHub.</div>
                                                    </div>
                                                    <Switch checked={workspaceConnectedSearch} onCheckedChange={setWorkspaceConnectedSearch} />
                                                </div>

                                                {workspaceConnectedSearch && isConnected && (
                                                    <RepoSelector
                                                        selectedRepos={selectedRepos}
                                                        onSelect={handleSaveRepos}
                                                        accountId={repoFetchAccountId} // Use the first available account or selected
                                                    />
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {[
                                        {
                                            icon: Target,
                                            title: "Sync Activity to Tasks",
                                            desc: "Your entire team will always know where projects stand at a glance."
                                        },
                                        {
                                            icon: RefreshCcw,
                                            title: "Update Task Status from GitHub",
                                            desc: "Change the status of your Agentflox tasks directly from GitHub."
                                        },
                                        {
                                            icon: LinkIcon,
                                            title: "Preview GitHub links in Agentflox",
                                            desc: "Link previews allow you to see live, synced visualizations of links directly in Agentflox."
                                        },
                                        {
                                            icon: PanelRight,
                                            title: "App panel in Task view",
                                            desc: "View links from GitHub from a central place in Task view."
                                        }
                                    ].map((feature) => (
                                        <Card key={feature.title} className="border-zinc-200">
                                            <CardContent className="p-4 flex items-start gap-3">
                                                <div className="mt-0.5">
                                                    <feature.icon className="w-5 h-5 text-zinc-600" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-medium text-zinc-900">{feature.title}</div>
                                                    <div className="text-xs text-zinc-500">{feature.desc}</div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="space-y-6">
                            <Card className="border-zinc-200">
                                <CardContent className="p-4 space-y-3">
                                    <div className="text-sm font-medium text-zinc-900">Connect repositories to Spaces</div>
                                    <div className="text-xs text-zinc-500">Automatically track GitHub activity inside selected Spaces.</div>
                                    <div className="text-sm text-zinc-500">No repositories added.</div>
                                </CardContent>
                            </Card>

                            <Card className="border-zinc-200">
                                <CardContent className="p-4 space-y-3">
                                    <div className="text-sm font-medium text-zinc-900">Auto-generated branch name</div>
                                    <div className="text-xs text-zinc-500">
                                        Valid substitutions: <code className="bg-zinc-100 px-1 rounded">:taskId:</code>,{" "}
                                        <code className="bg-zinc-100 px-1 rounded">:taskName:</code>,{" "}
                                        <code className="bg-zinc-100 px-1 rounded">:username:</code>
                                    </div>
                                    <Input
                                        value={branchTemplate}
                                        onChange={(e) => setBranchTemplate(e.target.value)}
                                        className="font-mono"
                                    />
                                    <div className="text-xs text-zinc-500">
                                        Preview:{" "}
                                        <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono">{branchPreview}</code>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

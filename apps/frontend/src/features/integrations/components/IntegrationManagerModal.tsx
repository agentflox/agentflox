'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Search,
  X,
  CheckCircle2,
  Lock,
  ExternalLink,
  Plus,
  LayoutGrid,
  Heart,
  TrendingUp,
  Calendar,
  Cloud,
  MessageSquare,
  Briefcase,
  Palette,
  Code2,
  Mail,
  CreditCard,
  BookOpen,
  Clock,
  Link2,
  Cpu,
  Layers,
  Sparkles,
  Users,
  CalendarClock,
  Zap,
  CheckSquare,
  Timer,
  ChevronRight,
  MonitorSmartphone,
  Workflow,
  FolderSync,
  Bot,
  Send,
  PlusCircle,
  FolderOpen,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntegrationCatalog } from '../hooks/useIntegrationCatalog';
import { IntegrationProviderIcon } from './IntegrationProviderIcon';
import { IntegrationAccountPicker } from './IntegrationAccountPicker';
import { IntegrationToolsList, type IntegrationToolItem } from './IntegrationToolsList';
import { ConnectionSetupContent } from './ConnectionSetupContent';
import { ConnectionCompleteContent } from './ConnectionCompleteContent';
import { connectIntegrationProvider } from '../lib/oauthPopup';
import { trpc } from '@/lib/trpc';
import {
  APP_CENTER_CATEGORIES,
  APP_CENTER_ITEMS,
  type AppCenterItem,
  type AppFeature,
  type AppCommand,
} from '../appCenterCatalog';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutGrid,
  Heart,
  TrendingUp,
  Calendar,
  Cloud,
  MessageSquare,
  Search,
  Briefcase,
  Palette,
  Code2,
  Mail,
  CreditCard,
  BookOpen,
  Clock,
  Link2,
  Cpu,
  Layers,
  Sparkles,
  Users,
  CalendarClock,
  Zap,
  CheckSquare,
  Timer,
};

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  link: Link2,
  panel: MonitorSmartphone,
  search: Search,
  workflow: Workflow,
  sync: FolderSync,
  bot: Bot,
  zap: Zap,
};

const COMMAND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  open: FolderOpen,
  create: PlusCircle,
  send: Send,
  sync: FolderSync,
  search: Search,
};

const CONNECTABLE = new Set(['github', 'slack', 'gmail', 'google_calendar', 'google_drive']);

type DialogView = 'manage' | 'setup' | 'complete';
type TabScope = 'personal' | 'workspace';

export type IntegrationManagerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAppId?: string | null;
  onSelectApp?: (appId: string) => void;
  onConnected?: (appId: string) => void;
  onDisconnected?: (appId: string) => void;
};

export function IntegrationManagerModal({
  open,
  onOpenChange,
  initialAppId = null,
  onSelectApp,
  onConnected,
  onDisconnected,
}: IntegrationManagerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initialAppId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabScope>('personal');
  const [view, setView] = useState<DialogView>('manage');
  const [oauthStatus, setOauthStatus] = useState<'connecting' | 'timeout' | 'idle'>('idle');
  const [localConnectedApps, setLocalConnectedApps] = useState<Set<string>>(new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { providersByUiKey, providersByCatalogId, refetch: refetchCatalog } = useIntegrationCatalog();

  const disconnectOAuth = trpc.integration.oauthDisconnect.useMutation({
    onSuccess: () => {
      toast.success('Account disconnected');
      refetchCatalog();
      if (selectedAppId) onDisconnected?.(selectedAppId);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect');
    },
  });

  const syncVault = trpc.integration.syncVault.useMutation();

  // Keep selected app in sync when prop changes
  useEffect(() => {
    if (initialAppId) {
      setSelectedAppId(initialAppId);
    }
  }, [initialAppId]);

  // Reset inner view when modal closes
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

  const selectedApp = useMemo(() => {
    if (!selectedAppId) return null;
    return APP_CENTER_ITEMS.find((item) => item.id === selectedAppId) ?? null;
  }, [selectedAppId]);

  // Check if an app is connected (either live backend or local mock state)
  const isAppConnected = useCallback(
    (app: AppCenterItem) => {
      if (localConnectedApps.has(app.id)) return true;
      if (app.oauthProvider) {
        const live = providersByUiKey[app.oauthProvider];
        if (live?.isConnected) return true;
      }
      const direct = providersByUiKey[app.id] ?? providersByCatalogId[app.id];
      return !!direct?.isConnected;
    },
    [localConnectedApps, providersByUiKey, providersByCatalogId],
  );

  // Filter apps list based on active category & search query
  const filteredApps = useMemo(() => {
    const list = APP_CENTER_ITEMS;
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      return list.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          app.category.toLowerCase().includes(q) ||
          app.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (selectedCategory === 'all') {
      return list;
    }
    if (selectedCategory === 'featured') {
      return list.filter((app) => app.isFeatured);
    }
    if (selectedCategory === 'mcp') {
      return list.filter((app) => app.isMcp);
    }
    if (selectedCategory === 'connections') {
      return list.filter((app) => isAppConnected(app));
    }

    return list.filter((app) => app.category === selectedCategory);
  }, [searchQuery, selectedCategory, isAppConnected]);

  const featuredApps = useMemo(() => {
    return APP_CENTER_ITEMS.filter((app) => app.isFeatured);
  }, []);

  // Live accounts & tools for selected app
  const currentCatalogProvider = useMemo(() => {
    if (!selectedApp) return null;
    const key = selectedApp.oauthProvider ?? selectedApp.id;
    return providersByUiKey[key] ?? providersByCatalogId[key] ?? null;
  }, [selectedApp, providersByUiKey, providersByCatalogId]);

  const pickerAccounts = useMemo(() => {
    if (!currentCatalogProvider?.accounts) return [];
    return currentCatalogProvider.accounts.map((account) => ({
      id: account.id,
      primaryLabel:
        account.primaryLabel ||
        account.providerAccountId ||
        `Account ${account.id.slice(0, 8)}…`,
      secondaryLabel: account.secondaryLabel ?? null,
      avatarUrl: account.avatarUrl ?? null,
    }));
  }, [currentCatalogProvider]);

  const toolsList: IntegrationToolItem[] = useMemo(() => {
    if (!currentCatalogProvider?.actions) return [];
    return currentCatalogProvider.actions.map((action) => ({
      actionId: action.actionId,
      displayName: action.displayName,
      description: action.description,
      verified: action.verified,
      toolName: action.toolName,
    }));
  }, [currentCatalogProvider]);

  // Start OAuth connection flow
  const startOAuth = useCallback(async () => {
    if (!selectedApp) return;
    const providerKey = selectedApp.oauthProvider ?? selectedApp.id;

    if (!CONNECTABLE.has(providerKey)) {
      // Mock toggle connection for demo apps
      setLocalConnectedApps((prev) => new Set(prev).add(selectedApp.id));
      toast.success(`${selectedApp.name} connected`);
      setView('complete');
      onConnected?.(selectedApp.id);
      return;
    }

    setOauthStatus('connecting');
    try {
      const result = await connectIntegrationProvider(providerKey);
      if (result.ok) {
        await syncVault.mutateAsync().catch(() => undefined);
        await refetchCatalog();
        toast.success(`${selectedApp.name} connected successfully`);
        setView('complete');
        setOauthStatus('idle');
        onConnected?.(selectedApp.id);
      } else {
        setOauthStatus('timeout');
      }
    } catch {
      setOauthStatus('timeout');
    }
  }, [selectedApp, syncVault, refetchCatalog, onConnected]);

  const handleConnectClick = useCallback(() => {
    setView('setup');
    startOAuth();
  }, [startOAuth]);

  const handleAppSelect = useCallback(
    (app: AppCenterItem) => {
      setSelectedAppId(app.id);
      setView('manage');
      setOauthStatus('idle');
      onSelectApp?.(app.id);
    },
    [onSelectApp],
  );

  const handleBackToAllApps = useCallback(() => {
    setSelectedAppId(null);
    setView('manage');
    setOauthStatus('idle');
  }, []);

  const isConnected = selectedApp ? isAppConnected(selectedApp) : false;

  // Active category display title
  const activeCategoryMeta = useMemo(() => {
    return (
      APP_CENTER_CATEGORIES.find((c) => c.id === selectedCategory) ?? {
        id: 'all',
        label: 'All Apps',
        iconName: 'LayoutGrid',
      }
    );
  }, [selectedCategory]);

  const CategoryHeaderIcon = CATEGORY_ICONS[activeCategoryMeta.iconName] ?? LayoutGrid;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[1140px] max-w-[1140px] w-[95vw] h-[86vh] max-h-[820px] p-0 overflow-hidden border border-zinc-200/90 shadow-2xl rounded-2xl bg-white flex flex-col"
        showCloseButton={false}
      >
        <div className="flex flex-1 h-full overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside className="w-[235px] shrink-0 border-r border-zinc-200/80 bg-zinc-50/60 flex flex-col h-full overflow-hidden select-none">
            {/* Sidebar Header */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-200/70 bg-white/70 backdrop-blur-xs">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-zinc-200/90 shadow-2xs p-1">
                <Image
                  src="/images/logo.png"
                  alt="App Center"
                  fill
                  className="object-contain p-1"
                />
              </div>
              <span className="font-semibold text-zinc-900 text-sm tracking-tight">
                App Center
              </span>
            </div>

            {/* Sidebar Navigation */}
            <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5 text-xs">
              {/* SECTION: INTEGRATIONS */}
              <div>
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Integrations
                </div>
                <div className="space-y-0.5 mt-1">
                  {APP_CENTER_CATEGORIES.filter((c) => c.section === 'integrations').map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.iconName] ?? LayoutGrid;
                    const isActive = selectedCategory === cat.id && !selectedAppId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedAppId(null);
                          setSearchQuery('');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer',
                          isActive
                            ? 'bg-zinc-200/80 text-zinc-900 font-semibold shadow-2xs'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                        )}
                      >
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-zinc-900' : 'text-zinc-500')} />
                        <span className="truncate">{cat.label}</span>
                        {cat.badge && (
                          <span className="ml-auto text-[9px] font-semibold uppercase px-1.5 py-0.2 bg-violet-100 text-violet-700 rounded">
                            {cat.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: AI */}
              <div>
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  AI
                </div>
                <div className="space-y-0.5 mt-1">
                  {APP_CENTER_CATEGORIES.filter((c) => c.section === 'ai').map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.iconName] ?? Cpu;
                    const isActive = selectedCategory === cat.id && !selectedAppId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedAppId(null);
                          setSearchQuery('');
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer',
                          isActive
                            ? 'bg-zinc-200/80 text-zinc-900 font-semibold shadow-2xs'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-zinc-900' : 'text-zinc-500')} />
                          <span className="truncate">{cat.label}</span>
                        </div>
                        {cat.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-md">
                            {cat.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: CLICKAPPS / AGENTAPPS */}
              <div>
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  ClickApps
                </div>
                <div className="space-y-0.5 mt-1">
                  {APP_CENTER_CATEGORIES.filter((c) => c.section === 'clickapps').map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.iconName] ?? Layers;
                    const isActive = selectedCategory === cat.id && !selectedAppId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSelectedAppId(null);
                          setSearchQuery('');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer',
                          isActive
                            ? 'bg-zinc-200/80 text-zinc-900 font-semibold shadow-2xs'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                        )}
                      >
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-zinc-900' : 'text-zinc-500')} />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar Sticky Footer */}
            <div className="p-3 border-t border-zinc-200/70 bg-zinc-50/90">
              <button
                type="button"
                onClick={() => toast.info('Suggest an app feature is coming soon!')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-zinc-500" />
                <span>Suggest an app</span>
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {/* Top Bar / Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200/80 bg-white shrink-0">
              {/* Left breadcrumb or category title */}
              <div className="flex items-center gap-2 min-w-0">
                {selectedApp ? (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <button
                      type="button"
                      onClick={handleBackToAllApps}
                      className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer transition-colors"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
                      All Apps
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="font-semibold text-zinc-900 text-sm">{selectedApp.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-900 font-semibold text-sm">
                    <CategoryHeaderIcon className="w-4 h-4 text-zinc-500" />
                    <span>{activeCategoryMeta.label}</span>
                  </div>
                )}
              </div>

              {/* Right Search Input & Close button */}
              <div className="flex items-center gap-3">
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="h-8 pl-8 pr-7 text-xs bg-zinc-50/80 border-zinc-200 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto">
              {selectedApp ? (
                /* ========================================================================= */
                /* VIEW 2: APP CENTER DETAIL / CENTER VIEW (Matching Screenshot 3)           */
                /* ========================================================================= */
                <div className="h-full flex flex-col md:flex-row p-6 lg:p-8 gap-8">
                  {/* Left Column: App Main Info, Connection Card, Features & Commands */}
                  <div className="flex-1 space-y-6 max-w-2xl">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-2xs">
                        <AppBrandAvatar app={selectedApp} size={42} />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                          {selectedApp.name}
                        </h1>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          {selectedApp.fullDescription ?? selectedApp.description}
                        </p>
                      </div>
                    </div>

                    {/* Scope Tabs: Personal vs Workspace */}
                    <div className="flex items-center gap-6 border-b border-zinc-200 text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => setActiveTab('personal')}
                        className={cn(
                          'flex items-center gap-2 pb-2.5 font-semibold transition-colors cursor-pointer border-b-2 -mb-px',
                          activeTab === 'personal'
                            ? 'border-zinc-900 text-zinc-900'
                            : 'border-transparent text-zinc-500 hover:text-zinc-800',
                        )}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Personal
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('workspace')}
                        className={cn(
                          'flex items-center gap-2 pb-2.5 font-semibold transition-colors cursor-pointer border-b-2 -mb-px',
                          activeTab === 'workspace'
                            ? 'border-zinc-900 text-zinc-900'
                            : 'border-transparent text-zinc-500 hover:text-zinc-800',
                        )}
                      >
                        <Users className="w-3.5 h-3.5" />
                        Workspace
                      </button>
                    </div>

                    {/* Connection / Setup / Complete Views */}
                    <div className="space-y-4">
                      {view === 'setup' && (
                        <div className="rounded-xl border border-zinc-200 bg-white shadow-2xs overflow-hidden">
                          <ConnectionSetupContent
                            provider={selectedApp.oauthProvider ?? selectedApp.id}
                            displayName={selectedApp.name}
                            status={oauthStatus}
                            onRetry={startOAuth}
                            onCancel={() => setView('manage')}
                            onNext={() => setView('complete')}
                          />
                        </div>
                      )}

                      {view === 'complete' && (
                        <div className="rounded-xl border border-zinc-200 bg-white shadow-2xs overflow-hidden">
                          <ConnectionCompleteContent
                            provider={selectedApp.oauthProvider ?? selectedApp.id}
                            displayName={selectedApp.name}
                            onDone={() => setView('manage')}
                            footerNote="Agentflox doesn't allow model providers to train on your data."
                          />
                        </div>
                      )}

                      {view === 'manage' && (
                        <div className="space-y-4">
                          {isConnected ? (
                            /* Connected State: Account Picker Card */
                            <Card className="border-zinc-200/90 shadow-2xs bg-white">
                              <CardContent className="p-4 space-y-3">
                                <IntegrationAccountPicker
                                  accounts={pickerAccounts}
                                  selectedAccountId={selectedAccountId}
                                  onSelectAccount={setSelectedAccountId}
                                  onConnect={handleConnectClick}
                                  onDisconnect={(accountId) =>
                                    disconnectOAuth.mutate({ accountId })
                                  }
                                  isConnecting={oauthStatus === 'connecting'}
                                  isConnected={isConnected}
                                  singleAccountOnly={selectedApp.id === 'github'}
                                  providerIcon={<AppBrandAvatar app={selectedApp} size={18} />}
                                  emptyLabel={`No ${selectedApp.name} account linked`}
                                />
                              </CardContent>
                            </Card>
                          ) : (
                            /* Disconnected State: Clean "Create a personal connection" Card */
                            <Card className="border-zinc-200/90 shadow-2xs bg-white">
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600">
                                    <Lock className="h-4 w-4 text-zinc-500" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-zinc-900">
                                      Create a personal connection
                                    </h4>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                      A connection only for you.
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={handleConnectClick}
                                  className="h-9 px-5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                                >
                                  Connect
                                </Button>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Features Section */}
                    {selectedApp.features && selectedApp.features.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                          Features
                        </h3>
                        <div className="space-y-2.5">
                          {selectedApp.features.map((feat) => {
                            const FeatureIcon = FEATURE_ICONS[feat.iconType] ?? Link2;
                            return (
                              <div
                                key={feat.title}
                                className="flex items-start gap-3.5 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300"
                              >
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200/60 text-zinc-600">
                                  <FeatureIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-semibold text-zinc-900">
                                      {feat.title}
                                    </h4>
                                    {feat.badge && (
                                      <span className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
                                        {feat.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                                    {feat.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Commands / Tools Section */}
                    {toolsList.length > 0 ? (
                      <div className="pt-2">
                        <IntegrationToolsList tools={toolsList} />
                      </div>
                    ) : selectedApp.commands && selectedApp.commands.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                          Commands
                        </h3>
                        <div className="space-y-2.5">
                          {selectedApp.commands.map((cmd) => {
                            const CmdIcon = COMMAND_ICONS[cmd.iconType] ?? FolderOpen;
                            return (
                              <div
                                key={cmd.title}
                                className="flex items-start gap-3.5 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300"
                              >
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200/60 text-zinc-600">
                                  <CmdIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-semibold text-zinc-900">
                                    {cmd.title}
                                  </h4>
                                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                                    {cmd.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Right Column: Built By, Category, Documentation Info */}
                  <div className="w-full md:w-56 lg:w-60 shrink-0 md:border-l md:border-zinc-200/80 md:pl-6 space-y-6 text-xs">
                    {/* BUILT BY */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Built By
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex h-5 w-5 items-center justify-center rounded-md bg-white border border-zinc-200 shadow-2xs p-0.5">
                          <Image
                            src="/images/logo.png"
                            alt="Agentflox"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <span className="font-semibold text-zinc-800">
                          {selectedApp.builtBy ?? 'Agentflox'}
                        </span>
                      </div>
                    </div>

                    {/* CATEGORY */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Category
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApp.tags && selectedApp.tags.length > 0 ? (
                          selectedApp.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 font-medium text-[11px]"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 font-medium text-[11px] capitalize">
                            {selectedApp.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DOCUMENTATION */}
                    {selectedApp.docsUrl && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                          Documentation
                        </div>
                        <a
                          href={selectedApp.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 hover:underline text-xs"
                        >
                          {selectedApp.name} for Agentflox
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ========================================================================= */
                /* VIEW 1: CATALOG GRID VIEW (Matching Screenshots 1 & 2)                    */
                /* ========================================================================= */
                <div className="p-6 lg:p-8 space-y-8">
                  {/* FEATURED SECTION (Shown on "all" or "featured" view without search) */}
                  {(selectedCategory === 'all' || selectedCategory === 'featured') &&
                    !searchQuery && (
                      <section className="space-y-3.5">
                        <div>
                          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                            Featured
                          </h2>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Some of our favorite and most popular integrations.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {featuredApps.map((app) => (
                            <AppCardItem
                              key={`featured-${app.id}`}
                              app={app}
                              isConnected={isAppConnected(app)}
                              onClick={() => handleAppSelect(app)}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                  {/* ALL APPS / FILTERED CATEGORY SECTION */}
                  <section className="space-y-3.5">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                        {searchQuery
                          ? `Search results for "${searchQuery}"`
                          : selectedCategory === 'all'
                            ? 'All Apps'
                            : activeCategoryMeta.label}
                      </h2>
                      {filteredApps.length === 0 && (
                        <p className="text-xs text-zinc-500 mt-1">
                          No integrations found matching your criteria.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredApps.map((app) => (
                        <AppCardItem
                          key={`all-${app.id}`}
                          app={app}
                          isConnected={isAppConnected(app)}
                          onClick={() => handleAppSelect(app)}
                        />
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Individual App Card Component in the Catalog Grid */
function AppCardItem({
  app,
  isConnected,
  onClick,
}: {
  app: AppCenterItem;
  isConnected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer text-left"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/70 bg-white p-1.5 shadow-2xs group-hover:scale-105 transition-transform">
          <AppBrandAvatar app={app} size={26} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-zinc-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
              {app.name}
            </h3>
            {app.isMcp && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded">
                MCP
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
            {app.description}
          </p>
        </div>
      </div>

      {isConnected && (
        <div className="shrink-0 pl-1">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
            <CheckCircle2 className="h-4 w-4 fill-emerald-500 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

/** App Brand Avatar / Icon Helper */
function AppBrandAvatar({ app, size = 28 }: { app: AppCenterItem; size?: number }) {
  if (app.iconSrc) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <Image
          src={app.iconSrc}
          alt={app.name}
          fill
          sizes={`${size}px`}
          className="object-contain"
        />
      </div>
    );
  }

  if (app.oauthProvider) {
    return <IntegrationProviderIcon providerId={app.oauthProvider} size={size} />;
  }

  if (app.brandBg) {
    return (
      <div
        className="flex items-center justify-center font-bold rounded shrink-0 shadow-2xs"
        style={{
          width: size,
          height: size,
          backgroundColor: app.brandBg,
          color: app.brandTextColor ?? '#FFFFFF',
          fontSize: Math.max(10, Math.floor(size * 0.35)),
        }}
      >
        {app.iconLetter ?? app.name.slice(0, 2)}
      </div>
    );
  }

  return <Settings className="text-zinc-500 shrink-0" style={{ width: size, height: size }} />;
}

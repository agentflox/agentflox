'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/useReduxStore';
import { toggleShowArchived, setShowArchived, setMessagingConfig } from '@/stores/slices/messages.slice';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import {
  Store, Search, MessageSquareOff, SquarePen, Settings, Loader2,
  MoreHorizontal, Pin, Archive, BellOff, Ban, Trash2, EyeOff, UserPlus, VolumeX, X
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Button from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function peerPhoto(peer: { image?: string | null; avatar?: string | null }) {
  return peer.image || peer.avatar || null;
}

type ConnectionPeer = {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
  avatar: string | null;
};

export function MessagesSidebar({ activeId }: { activeId?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [newMsgQuery, setNewMsgQuery] = useState('');
  const [isNewMsgOpen, setIsNewMsgOpen] = useState(false);
  const dispatch = useAppDispatch();
  const showArchived = useAppSelector((s) => s.messagesUI.showArchived);
  const notificationsEnabled = useAppSelector((s) => s.messagesUI.notificationsEnabled);
  const blockAll = useAppSelector((s) => s.messagesUI.blockAll);
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [archiveConvId, setArchiveConvId] = useState<string | null>(null);
  const [blockConvId, setBlockConvId] = useState<{ id: string; name: string } | null>(null);
  const [isManageBlockedOpen, setIsManageBlockedOpen] = useState(false);
  const [isAddPeopleOpen, setIsAddPeopleOpen] = useState(false);
  const [addPeopleEmail, setAddPeopleEmail] = useState('');

  const isQueryValid = addPeopleEmail.trim().length > 2;
  const { data: searchResult, isLoading: isSearching } = trpc.user.searchPeople.useQuery(
    { query: addPeopleEmail.trim() },
    { enabled: isQueryValid, retry: false }
  );

  const sendConnectionRequest = trpc.connections.request.useMutation({
    onSuccess: () => {
      toast({ title: 'Connection request sent!' });
      setIsAddPeopleOpen(false);
      setAddPeopleEmail('');
    },
    onError: (err) => {
      toast({ title: 'Failed to send request', description: err.message, variant: 'destructive' });
    }
  });

  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: dbConfig } = trpc.settings.getMessagingConfig.useQuery(undefined, {
    staleTime: Infinity,
  });

  const updateConfig = trpc.settings.updateMessagingConfig.useMutation({
    onSuccess: () => {
      utils.settings.getMessagingConfig.invalidate();
    }
  });

  const { data: blockedData, isLoading: isLoadingBlocked } = trpc.messages.listBlocked.useQuery(undefined, {
    enabled: isManageBlockedOpen,
  });

  const unblockMutation = trpc.messages.unblock.useMutation({
    onSuccess: () => {
      utils.messages.listBlocked.invalidate();
      utils.messages.listConversations.invalidate();
      toast({ title: 'User unblocked successfully.' });
    },
    onError: (err) => {
      toast({ title: 'Failed to unblock', description: err.message, variant: 'destructive' });
    }
  });

  useEffect(() => {
    if (dbConfig) {
      dispatch(setMessagingConfig(dbConfig as any));
    }
  }, [dbConfig, dispatch]);

  const createConv = trpc.messages.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      setIsNewMsgOpen(false);
      // Route to the new or existing conversation
      router.push(`/dashboard/messages/${data.conversationId}?isNew=true`);
    },
    onError: (err) => {
      toast({ title: 'Could not create message', description: err.message, variant: 'destructive' });
    }
  });

  const convAction = trpc.messages.conversationAction.useMutation({
    onMutate: async ({ conversationId, action, value }) => {
      // Cancel any in-flight refetches first
      await utils.messages.listConversations.cancel({ page: 1, pageSize: 50 });

      // Snapshot for rollback
      const previousData = utils.messages.listConversations.getData({ page: 1, pageSize: 50 });

      // Instant optimistic update
      utils.messages.listConversations.setData({ page: 1, pageSize: 50 }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: any) => {
            if (item.id !== conversationId) return item;
            const update: any = { ...item };
            if (action === 'pin') update.is_pinned = value;
            if (action === 'archive') update.is_archived = value;
            if (action === 'mute') update.is_muted = value;
            if (action === 'hide_status') update.is_hidden_status = value;
            if (action === 'delete' || action === 'block') return null;
            return update;
          }).filter(Boolean),
        };
      });

      return { previousData };
    },
    onSuccess: (_data, variables) => {
      // Don't re-fetch for delete/block — item is gone and server would return it again
      if (variables.action !== 'delete' && variables.action !== 'block') {
        setTimeout(() => utils.messages.listConversations.invalidate(), 1500);
      }
    },
    onError: (err, _vars, ctx) => {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
      // Roll back to snapshot
      if (ctx?.previousData) {
        utils.messages.listConversations.setData({ page: 1, pageSize: 50 }, ctx.previousData);
      }
    },
  });

  const handleConvAction = useCallback((conversationId: string, action: 'pin' | 'archive' | 'mute' | 'hide_status' | 'delete' | 'block', currentValue: boolean) => {
    convAction.mutate({ conversationId, action: action as any, value: !currentValue });
    // When unarchiving, switch back to the regular inbox view
    if (action === 'archive' && currentValue === true) {
      dispatch(setShowArchived(false));
    }
  }, [convAction, dispatch]);

  // Navigate to next unarchived conv after removing the active one.
  // Must be called AFTER the optimistic cache update so the filter is accurate.
  const navigateAfterRemove = useCallback((removedId: string) => {
    if (activeId !== removedId) return; // not active, no navigation needed
    const remaining = (utils.messages.listConversations.getData({ page: 1, pageSize: 50 }) as any)?.items
      ?.filter((item: any) => item.id !== removedId && !item.is_archived);
    const next = remaining?.[0];
    if (next?.id) {
      router.replace(`/dashboard/messages/${next.id}`);
    } else {
      // No more conversations — go to base route which shows sidebar + empty state
      router.replace('/dashboard/messages');
    }
  }, [activeId, utils, router]);
  const pathname = usePathname();

  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sidebarRef.current) return;
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - sidebarRect.left;

      if (newWidth >= 280 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging]);

  useEffect(() => {
    const saved = localStorage.getItem('messages-sidebar-width');
    if (saved) {
      setSidebarWidth(parseInt(saved, 10));
    }
  }, []);

  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('messages-sidebar-width', sidebarWidth.toString());
    }
  }, [isDragging, sidebarWidth]);

  // Extract base path reliably
  const basePath = useMemo(() => {
    const normalized = pathname.replace(/\/$/, '');
    if (normalized === '/dashboard/messages') return '/dashboard/messages';
    if (normalized.startsWith('/dashboard/messages/')) return '/dashboard/messages';
    return '/dashboard/messages';
  }, [pathname]);

  const { data: convData, isLoading: convLoading } = trpc.messages.listConversations.useQuery(
    { page: 1, pageSize: 50 },
    {
      staleTime: 30_000,           // keeps optimistic updates alive during a session
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  // Force a fresh server fetch on mount so the list is always up to date
  useEffect(() => {
    utils.messages.listConversations.invalidate({ page: 1, pageSize: 50 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connReceived = trpc.connections.list.useQuery(
    { scope: 'received', status: 'ACCEPTED', page: 1, pageSize: 50 },
    { refetchOnMount: 'always' }
  );
  const connSent = trpc.connections.list.useQuery(
    { scope: 'sent', status: 'ACCEPTED', page: 1, pageSize: 50 },
    { refetchOnMount: 'always' }
  );

  const isLoading = convLoading && !convData;

  const conversations = useMemo(() => {
    const apiRows = (convData?.items || []).map((it: any) => {
      const uId = String(it.user_id || '');
      const displayName = it.name || it.username || (it.email ? String(it.email).split('@')[0] : null) || null;
      return {
        id: it.id,
        userId: uId,
        name: displayName,
        avatar: (it.avatar as string | null) ?? null,
        unread: Number(it.unread || 0),
        lastAt: it.last_at || new Date(0),
        marketplaceListingId: it.marketplace_listing_id as string | null,
        marketplaceListingTitle: it.marketplace_listing_title as string | null,
        connectionOnly: false,
        isPinned: !!(it as any).is_pinned,
        isArchived: !!(it as any).is_archived,
        isMuted: !!(it as any).is_muted,
        isHiddenStatus: !!(it as any).is_hidden_status,
        // keep snake_case aliases so dropdown bindings work too
        is_pinned: !!(it as any).is_pinned,
        is_archived: !!(it as any).is_archived,
        is_muted: !!(it as any).is_muted,
        is_hidden_status: !!(it as any).is_hidden_status,
      };
    });

    const byConvId = new Map(apiRows.map((r) => [r.id, r]));
    const byUserId = new Map(apiRows.map((r) => [r.userId, r]));

    const addConnPeer = (
      peer: { id: string | number; name?: string | null; username?: string | null; image?: string | null; avatar?: string | null } | null,
      lastAt: string | Date | null
    ) => {
      if (!peer) return;
      const pid = String(peer.id || '');
      if (!pid) return;

      const existing = byUserId.get(pid);
      if (existing) {
        existing.connectionOnly = true;
      }
    };

    if (connReceived.data?.items) {
      for (const c of connReceived.data.items) {
        addConnPeer(c.requester, c.acceptedAt || c.requestedAt);
      }
    }
    if (connSent.data?.items) {
      for (const c of connSent.data.items) {
        addConnPeer(c.receiver, c.acceptedAt || c.requestedAt);
      }
    }

    const merged = Array.from(byConvId.values()).sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = new Date(a.lastAt as any).getTime();
      const timeB = new Date(b.lastAt as any).getTime();
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });

    const filtered = merged.filter((i: any) => showArchived ? true : !i.isArchived);

    if (!query.trim()) return filtered;
    const q = query.trim().toLowerCase();
    return filtered.filter(
      (i: any) =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.marketplaceListingTitle || '').toLowerCase().includes(q)
    );
  }, [convData, connReceived.data, connSent.data, query, showArchived]);

  return (
    <div
      ref={sidebarRef}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      className="relative flex h-full min-h-0 w-full shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden md:w-[var(--sidebar-width)]"
    >
      {/* Removed Resizer Handle */}

      {/* Premium Search Header */}
      <div className="sticky top-0 z-10 border-b border-zinc-100/80 bg-white/80 px-4 py-5 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Messages
          </h2>
          <div className="flex items-center gap-1">
            <Popover open={isNewMsgOpen} onOpenChange={setIsNewMsgOpen}>
              <PopoverTrigger asChild>
                <button className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer" title="Create new message">
                  <SquarePen className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[320px] p-0 overflow-hidden shadow-lg border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <div className="flex items-center justify-between p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <span className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 px-1">New message</span>
                  <button onClick={() => setIsNewMsgOpen(false)} className="p-1 rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-4 py-2.5 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">To:</span>
                  <input
                    className="flex-1 outline-none text-sm bg-transparent placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
                    placeholder="Search connections..."
                    value={newMsgQuery}
                    onChange={(e) => setNewMsgQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                  {/* Reuse existing addConnPeer logic for connections */}
                  {Array.from(
                    new Map(
                      ([
                        ...(connReceived.data?.items || []).map((c): [string, ConnectionPeer] => [c.requester.id, c.requester]),
                        ...(connSent.data?.items || []).map((c): [string, ConnectionPeer] => [c.receiver.id, c.receiver]),
                      ])
                    ).values()
                  )
                    .filter(user => user && (!newMsgQuery.trim() || (user.name || user.username || '').toLowerCase().includes(newMsgQuery.toLowerCase())))
                    .map(user => (
                      <button
                        key={user.id}
                        disabled={createConv.isPending}
                        onClick={() => createConv.mutate({ userId: String(user.id) })}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
                      >
                        <Avatar className="h-9 w-9 border border-black/5 dark:border-white/10">
                          <AvatarImage src={user.avatar || user.image || undefined} className="object-cover" />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold dark:bg-indigo-900 dark:text-indigo-300">
                            {(user.name || user.username || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name || user.username}</div>
                        </div>
                      </button>
                    ))}
                  {(!connReceived.data?.items?.length && !connSent.data?.items?.length) && (
                    <div className="px-4 py-8 text-center text-sm text-zinc-500">
                      You have no active connections to message.
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer" title="Settings">
                  <Settings className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => setIsAddPeopleOpen(true), 150);
                }}>
                  <UserPlus className="h-4 w-4 text-zinc-500" /> Add people
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => setIsManageBlockedOpen(true), 150);
                }}>
                  <Ban className="h-4 w-4 text-zinc-500" /> Manage blocked
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => {
                    const newValue = !showArchived;
                    dispatch(setShowArchived(newValue));
                    updateConfig.mutate({ showArchived: newValue });
                  }}
                >
                  <Archive className="h-4 w-4 text-zinc-500" /> {showArchived ? 'Hide archived' : 'Show archived'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Updated Search Input Wrapper */}
        <div className="w-full">
          <div className="flex h-10 items-center rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 shadow-sm transition-all duration-300 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:focus-within:border-indigo-500/50 dark:focus-within:bg-zinc-900">
            <Search className="h-4 w-4 shrink-0 text-zinc-400 transition-colors group-focus-within:text-indigo-500" />
            <Input
              variant="ghost"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="h-full px-1 border-none bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 font-medium placeholder:text-zinc-400"
            />
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2 animate-pulse">
                <div className="h-12 w-12 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded-md bg-neutral-100 dark:bg-neutral-800" />
                  <div className="h-3 w-32 rounded-md bg-neutral-50 dark:bg-neutral-900" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length ? (
          <div className="flex flex-col gap-1">
            {conversations.map((c: any) => {
              const isActive = activeId === c.id;

              return (
                <Link
                  key={c.id}
                  href={`${basePath}/${c.id}`}
                  className={`group relative flex w-full cursor-pointer items-center gap-3.5 rounded-2xl py-3 pr-3 pl-4 text-left outline-none transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${isActive
                    ? 'bg-indigo-50/80 shadow-sm ring-1 ring-indigo-100/50 dark:bg-indigo-500/10 dark:ring-indigo-500/20'
                    : 'hover:bg-zinc-50 dark:hover:bg-white/5 active:scale-[0.98]'
                    }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                  )}

                  <div className="relative shrink-0">
                    {c.marketplaceListingTitle ? (
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-105 ${isActive ? 'border-indigo-200/50 bg-gradient-to-br from-indigo-50 to-indigo-100/50 shadow-md ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950' : 'border-violet-200/50 bg-gradient-to-br from-violet-50 to-violet-100/50 shadow-sm dark:border-violet-700/30 dark:from-violet-900/40 dark:to-violet-950/40'}`}>
                        <Store className={`h-5 w-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-violet-600 dark:text-violet-400'}`} />
                      </div>
                    ) : (
                      <Avatar className={`h-12 w-12 transition-all duration-300 group-hover:scale-105 ${isActive ? 'shadow-md ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950' : 'shadow-sm ring-1 ring-black/5 dark:ring-white/10'}`}>
                        <AvatarImage src={c.avatar || undefined} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white tracking-wider">
                          {(c.name || '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[15px] font-bold tracking-tight transition-colors ${isActive
                          ? 'text-indigo-950 dark:text-indigo-100'
                          : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                      >
                        {c.marketplaceListingTitle || c.name || 'Unknown user'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 transition-opacity group-hover:opacity-0">
                        {c.isPinned && <Pin className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500" />}
                        {c.isMuted && <BellOff className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />}
                        {c.isArchived && <Archive className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />}
                        {c.unread > 0 && (
                          <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-950">
                            {c.unread > 99 ? '99+' : c.unread}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.marketplaceListingTitle ? (
                      <span className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                        {c.name}
                      </span>
                    ) : (
                      <span className="mt-1 truncate text-xs font-medium text-zinc-400 dark:text-zinc-500">
                        Direct Message
                      </span>
                    )}
                  </div>

                  {/* Conversation Actions */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-sm rounded-lg p-0.5 z-10" onClick={(e) => e.preventDefault()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleConvAction(c.id, 'pin', c.isPinned)}>
                          <Pin className="h-4 w-4 text-zinc-500" /> {c.isPinned ? 'Unpin' : 'Pin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => {
                          if (!c.isArchived) {
                            setArchiveConvId(c.id);
                          } else {
                            handleConvAction(c.id, 'archive', true);
                          }
                        }}>
                          <Archive className="h-4 w-4 text-zinc-500" /> {c.isArchived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleConvAction(c.id, 'mute', c.isMuted)}>
                          <VolumeX className="h-4 w-4 text-zinc-500" /> {c.isMuted ? 'Unmute' : 'Mute'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleConvAction(c.id, 'hide_status', c.isHiddenStatus)}>
                          <EyeOff className="h-4 w-4 text-zinc-500" /> {c.isHiddenStatus ? 'Show status' : 'Hide status'}
                        </DropdownMenuItem>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                        <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 dark:text-red-400" onClick={() => {
                          setBlockConvId({ id: c.id, name: c.marketplace_listing_title || c.name || c.username });
                        }}>
                          <Ban className="h-4 w-4" /> Block
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 dark:text-red-400" onClick={() => setDeleteConvId(c.id)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center space-y-3 p-8 text-center opacity-80">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900">
              <MessageSquareOff className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                No conversations found
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Try adjusting your search query.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!deleteConvId} onOpenChange={(open) => !open && setDeleteConvId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This will hide it from your messages list. You can still access the messages if the other person replies.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              className="cursor-pointer bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => setDeleteConvId(null)}
            >Cancel</Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              onClick={() => {
                if (deleteConvId) {
                  // Apply optimistic removal FIRST so navigateAfterRemove sees updated list
                  utils.messages.listConversations.setData({ page: 1, pageSize: 50 }, (old: any) => {
                    if (!old) return old;
                    return { ...old, items: old.items.filter((i: any) => i.id !== deleteConvId) };
                  });
                  navigateAfterRemove(deleteConvId);
                  handleConvAction(deleteConvId, 'delete', false);
                  setDeleteConvId(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveConvId} onOpenChange={(open) => !open && setArchiveConvId(null)}>
        <DialogContent className="[&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Archive conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this conversation? It will be hidden from your main inbox.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              className="cursor-pointer bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => setArchiveConvId(null)}
            >Cancel</Button>
            <Button
              className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => {
                if (archiveConvId) {
                  // Apply optimistic archive FIRST so navigateAfterRemove sees updated list
                  utils.messages.listConversations.setData({ page: 1, pageSize: 50 }, (old: any) => {
                    if (!old) return old;
                    return {
                      ...old,
                      items: old.items.map((i: any) =>
                        i.id === archiveConvId ? { ...i, is_archived: true, isArchived: true } : i
                      ),
                    };
                  });
                  navigateAfterRemove(archiveConvId);
                  handleConvAction(archiveConvId, 'archive', false);
                  setArchiveConvId(null);
                }
              }}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blockConvId} onOpenChange={(open) => !open && setBlockConvId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {blockConvId?.name}?</DialogTitle>
            <DialogDescription>
              They will not be able to send you messages. This conversation will be hidden from your inbox. You can unblock them later in settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              className="cursor-pointer bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => setBlockConvId(null)}
            >Cancel</Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              onClick={() => {
                if (blockConvId) {
                  const id = blockConvId.id;
                  utils.messages.listConversations.setData({ page: 1, pageSize: 50 }, (old: any) => {
                    if (!old) return old;
                    return { ...old, items: old.items.filter((i: any) => i.id !== id) };
                  });
                  navigateAfterRemove(id);
                  handleConvAction(id, 'block', false);
                  setBlockConvId(null);
                }
              }}
            >
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Blocked Dialog */}
      <Dialog open={isManageBlockedOpen} onOpenChange={setIsManageBlockedOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <DialogTitle className="text-[17px] font-bold flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" /> Manage Blocked
            </DialogTitle>
            <DialogDescription className="text-sm">
              Users you have blocked from messaging you.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[140px] max-h-[350px] overflow-y-auto py-2">
            {isLoadingBlocked ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-8">
                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-zinc-500 font-medium">Loading blocked users...</p>
              </div>
            ) : blockedData && blockedData.length > 0 ? (
              <div className="flex flex-col">
                {blockedData.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-700 shadow-sm shrink-0 opacity-70">
                        <AvatarImage src={c.avatar || undefined} className="object-cover" />
                        <AvatarFallback className="bg-zinc-100 text-zinc-500 text-[10px] font-bold">
                          {c.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 truncate line-through opacity-70">
                          {c.name}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-8 px-3 shrink-0 ml-3 rounded-lg cursor-pointer text-[12px] font-semibold transition-colors bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 dark:hover:bg-indigo-500/20"
                      disabled={unblockMutation.isPending}
                      onClick={() => unblockMutation.mutate({ conversationId: c.id })}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-zinc-500 py-10">
                <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3">
                  <Ban className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-300">No blocked users</p>
                <p className="text-sm mt-1 max-w-[200px]">You haven't blocked anyone in your conversations.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add People Dialog */}
      <Dialog open={isAddPeopleOpen} onOpenChange={(open) => {
        setIsAddPeopleOpen(open);
        if (!open) setAddPeopleEmail('');
      }}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <DialogTitle className="text-[17px] font-bold">Add people</DialogTitle>
            <DialogDescription className="text-sm">
              Enter an exact email or username to find and connect.
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-500">Search:</span>
            <input
              className="flex-1 outline-none text-sm bg-transparent placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
              placeholder="Exact email or username..."
              value={addPeopleEmail}
              onChange={(e) => setAddPeopleEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="min-h-[140px] py-2">
            {isQueryValid && isSearching ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                <p className="text-xs text-zinc-500 font-medium">Searching directory...</p>
              </div>
            ) : isQueryValid && searchResult ? (
              <div className="px-4 py-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-700 shadow-sm shrink-0">
                      <AvatarImage src={searchResult.avatar || searchResult.image || undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold tracking-wider text-[10px]">
                        {(searchResult.name || searchResult.username || searchResult.email || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{searchResult.name || searchResult.username || searchResult.email}</span>
                      <Link href={`/profiles/${searchResult.id}`} className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5" onClick={() => setIsAddPeopleOpen(false)}>
                        View Profile
                      </Link>
                    </div>
                  </div>
                  <Button
                    className="h-7 px-3 shrink-0 ml-2 rounded-lg cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold text-[11px]"
                    disabled={sendConnectionRequest.isPending}
                    onClick={() => sendConnectionRequest.mutate({ userId: searchResult.id })}
                  >
                    {sendConnectionRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Connect'}
                  </Button>
                </div>
              </div>
            ) : isQueryValid && searchResult === null ? (
              <div className="flex flex-col items-center justify-center text-center text-zinc-500 py-8">
                <UserPlus className="h-6 w-6 opacity-40 mb-2" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No user found</p>
                <p className="text-xs mt-1">Check the search term and try again.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500 py-8">
                <Search className="h-6 w-6 opacity-40 mb-2" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Search by exact email or username</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
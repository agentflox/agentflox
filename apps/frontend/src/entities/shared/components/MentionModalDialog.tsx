'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { User, FileText, CheckSquare2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export type MentionKind = 'task' | 'doc' | 'person';

export interface MentionItem {
    id: string;
    label: string;
    kind: MentionKind;
    avatar?: string;
    subtitle?: string;
}

export interface MentionModalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialTab: 'tasks' | 'docs' | 'people';
    spaceId?: string | null;
    workspaceId?: string | null;
    projectId?: string | null;
    onSelect: (item: MentionItem) => void;
    position?: { top: number; left: number };
}

export function MentionModalDialog({
    open,
    onOpenChange,
    initialTab,
    spaceId,
    workspaceId,
    projectId,
    onSelect,
    position,
}: MentionModalDialogProps) {
    const [activeTab, setActiveTab] = useState<'tasks' | 'docs' | 'people'>(initialTab);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Fetch tasks
    const taskQueryInput = useMemo(() => {
        const input: Record<string, unknown> = { includeRelations: true, pageSize: 50 };
        if (spaceId) input.spaceId = spaceId;
        if (projectId) input.projectId = projectId;
        if (workspaceId) input.workspaceId = workspaceId;
        return input;
    }, [spaceId, projectId, workspaceId]);

    const { data: tasksData } = trpc.task.list.useQuery(taskQueryInput as any, {
        enabled: activeTab === 'tasks',
    });

    // Fetch space data for people/teams
    const { data: spaceData } = trpc.space.get.useQuery(
        { id: spaceId || '' },
        { enabled: activeTab === 'people' && !!spaceId },
    );

    // Fetch project participants if projectId
    const { data: projectParticipants } = trpc.project.getParticipants.useQuery(
        { projectId: projectId || '' },
        { enabled: activeTab === 'people' && !!projectId },
    );

    // Transform data to MentionItem format
    const tasks: MentionItem[] = useMemo(() => {
        const items = (tasksData as any)?.items || [];
        return items.map((task: any) => ({
            id: task.id,
            label: task.title || 'Untitled',
            kind: 'task' as const,
            subtitle: task.status?.name,
        }));
    }, [tasksData]);

    const people: MentionItem[] = useMemo(() => {
        const items: MentionItem[] = [];

        // Add "Me" first
        items.push({
            id: 'me',
            label: 'Me',
            kind: 'person',
        });

        // Add people from space
        if (spaceData?.teams) {
            const teamsArray = Array.isArray(spaceData.teams)
                ? spaceData.teams
                : (spaceData.teams as any).teams || [];

            if (Array.isArray(teamsArray)) {
                teamsArray.forEach((team: any) => {
                    if (team.members && Array.isArray(team.members)) {
                        team.members.forEach((member: any) => {
                            if (member.user) {
                                items.push({
                                    id: member.user.id,
                                    label: member.user.name || member.user.email || 'Unknown',
                                    kind: 'person',
                                    avatar: member.user.image,
                                    subtitle: member.user.email,
                                });
                            }
                        });
                    }
                });
            }
        }

        // Add project participants
        const participants = (projectParticipants as any[]) || [];
        participants.forEach((participant: any) => {
            if (participant.user && !items.find((p) => p.id === participant.user.id)) {
                items.push({
                    id: participant.user.id,
                    label: participant.user.name || participant.user.email || 'Unknown',
                    kind: 'person',
                    avatar: participant.user.image,
                    subtitle: participant.user.email,
                });
            }
        });

        return items;
    }, [spaceData, projectParticipants]);

    const docs: MentionItem[] = useMemo(() => {
        return [];
    }, []);

    const filteredItems = useMemo(() => {
        const items = activeTab === 'tasks' ? tasks : activeTab === 'docs' ? docs : people;
        if (!searchQuery.trim()) return items;
        const q = searchQuery.toLowerCase();
        return items.filter((item) => item.label.toLowerCase().includes(q));
    }, [activeTab, searchQuery, tasks, docs, people]);

    const getIcon = (kind: MentionKind) => {
        switch (kind) {
            case 'task':
                return <CheckSquare2 className="h-4 w-4" />;
            case 'doc':
                return <FileText className="h-4 w-4" />;
            case 'person':
                return <User className="h-4 w-4" />;
        }
    };

    const getAvatar = (item: MentionItem) => {
        if (item.avatar) {
            return (
                <img
                    src={item.avatar}
                    alt={item.label}
                    className="h-6 w-6 rounded-full object-cover"
                />
            );
        }
        const initials = item.label
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        return (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-700">
                {initials}
            </div>
        );
    };

    const itemButtonClass =
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-50 transition-colors';

    if (typeof window === 'undefined') return null;
    if (!open || !position) return null;

    const content = (
        <div
            data-mention-modal
            className="fixed z-50 bg-white border border-zinc-200 rounded-md shadow-lg w-[400px] max-w-[90vw]"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="grid w-full grid-cols-3 m-0 rounded-t-md rounded-b-none">
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="docs">Docs</TabsTrigger>
                    <TabsTrigger value="people">People</TabsTrigger>
                </TabsList>
                <div className="max-h-[400px] overflow-y-auto mt-4 px-2">
                    <TabsContent value="tasks" className="mt-0">
                        <div className="space-y-1">
                            {filteredItems.length === 0 ? (
                                <div className="px-3 py-8 text-center text-sm text-zinc-400">
                                    No tasks found
                                </div>
                            ) : (
                                filteredItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            onSelect(item);
                                            onOpenChange(false);
                                        }}
                                        className={itemButtonClass}
                                    >
                                        <div className="flex h-6 w-6 items-center justify-center rounded text-zinc-600">
                                            {getIcon(item.kind)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-zinc-900 truncate">
                                                {item.label}
                                            </div>
                                            {item.subtitle && (
                                                <div className="text-xs text-zinc-400 truncate">
                                                    {item.subtitle}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="docs" className="mt-0">
                        <div className="space-y-1">
                            {filteredItems.length === 0 ? (
                                <div className="px-3 py-8 text-center text-sm text-zinc-400">
                                    No docs found
                                </div>
                            ) : (
                                filteredItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            onSelect(item);
                                            onOpenChange(false);
                                        }}
                                        className={itemButtonClass}
                                    >
                                        <div className="flex h-6 w-6 items-center justify-center rounded text-zinc-600">
                                            {getIcon(item.kind)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-zinc-900 truncate">
                                                {item.label}
                                            </div>
                                            {item.subtitle && (
                                                <div className="text-xs text-zinc-400 truncate">
                                                    {item.subtitle}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="people" className="mt-0">
                        <div className="space-y-1">
                            {filteredItems.length === 0 ? (
                                <div className="px-3 py-8 text-center text-sm text-zinc-400">
                                    No people found
                                </div>
                            ) : (
                                filteredItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            onSelect(item);
                                            onOpenChange(false);
                                        }}
                                        className={itemButtonClass}
                                    >
                                        {getAvatar(item)}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-zinc-900 truncate">
                                                {item.label}
                                            </div>
                                            {item.subtitle && (
                                                <div className="text-xs text-zinc-400 truncate">
                                                    {item.subtitle}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </div>
                <div className="border-t border-zinc-200 p-2 mt-4">
                    <Input
                        type="text"
                        placeholder={`Type ${activeTab === 'tasks' ? 'task' : activeTab === 'docs' ? 'page' : 'user'} name...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                onOpenChange(false);
                            }
                        }}
                    />
                </div>
            </Tabs>
        </div>
    );

    return createPortal(content, document.body);
}

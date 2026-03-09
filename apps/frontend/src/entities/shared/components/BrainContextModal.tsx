'use client';

import { useState } from 'react';
import { Search, Check, X, FolderKanban, List, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

export type BrainContextEntity = {
    type: 'list' | 'project' | 'space';
    id: string;
    name: string;
    description?: string;
};

interface BrainContextModalProps {
    spaceId: string | null;
    workspaceId: string | null;
    projectId?: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedContexts: BrainContextEntity[];
    onContextsChange: (contexts: BrainContextEntity[]) => void;
    onSelect: (entity: BrainContextEntity) => void;
}

export function BrainContextModal({
    spaceId,
    workspaceId,
    projectId,
    open,
    onOpenChange,
    selectedContexts,
    onContextsChange,
    onSelect,
}: BrainContextModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'lists' | 'projects' | 'space'>('lists');

    const { data: space } = trpc.space.get.useQuery(
        { id: spaceId as string },
        { enabled: open && !!spaceId }
    );
    const { data: listsData } = trpc.list.byContext.useQuery(
        { spaceId: spaceId ?? undefined, projectId: projectId ?? undefined, workspaceId: workspaceId ?? undefined },
        { enabled: open && !!(spaceId || projectId || workspaceId) }
    );
    const projects = space?.projects ?? [];
    const lists = space?.lists ?? listsData?.items ?? [];

    const toggleContext = (entity: BrainContextEntity) => {
        const exists = selectedContexts.some((c) => c.type === entity.type && c.id === entity.id);
        if (exists) {
            onContextsChange(selectedContexts.filter((c) => !(c.type === entity.type && c.id === entity.id)));
        } else {
            onContextsChange([...selectedContexts, entity]);
        }
    };

    const handleItemClick = (entity: BrainContextEntity) => {
        toggleContext(entity);
        onSelect(entity);
    };

    const isSelected = (type: string, id: string) => {
        return selectedContexts.some((c) => c.type === type && c.id === id);
    };

    const getFilteredItems = () => {
        const query = searchQuery.toLowerCase().trim();
        const filter = (items: { name: string; description?: string }[]) =>
            items.filter(
                (item) =>
                    !query ||
                    item.name.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query)
            );

        switch (activeTab) {
            case 'space':
                return space
                    ? filter([
                          {
                              type: 'space' as const,
                              id: space.id,
                              name: space.name,
                              description: space.description || undefined,
                          },
                      ])
                    : [];
            case 'lists':
                return filter(
                    lists.map((list: any) => ({
                        type: 'list' as const,
                        id: list.id,
                        name: list.name,
                        description: list.description || undefined,
                    }))
                );
            case 'projects':
                return filter(
                    projects?.map((project: any) => ({
                        type: 'project' as const,
                        id: project.id,
                        name: project.name,
                        description: project.description || undefined,
                    })) ?? []
                );
            default:
                return [];
        }
    };

    const filteredItems = getFilteredItems();

    const handleClose = () => {
        setSearchQuery('');
        onOpenChange(false);
    };

    const hasContext = !!(spaceId || workspaceId);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Add context</DialogTitle>
                    <DialogDescription>
                        Select lists, projects, or the space to include in your message. The AI will use this context
                        when generating text.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {selectedContexts.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Selected ({selectedContexts.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedContexts.map((context) => (
                                    <Badge
                                        key={`${context.type}-${context.id}`}
                                        variant="secondary"
                                        className="flex items-center gap-1.5 pr-1"
                                    >
                                        @{context.name}
                                        <button
                                            onClick={() => toggleContext(context)}
                                            className="ml-1 rounded-full hover:bg-slate-200"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="lists" className="text-xs">
                                <List className="mr-1 h-3 w-3" />
                                Lists
                            </TabsTrigger>
                            <TabsTrigger value="projects" className="text-xs">
                                <LayoutGrid className="mr-1 h-3 w-3" />
                                Projects
                            </TabsTrigger>
                            <TabsTrigger value="space" className="text-xs">
                                <FolderKanban className="mr-1 h-3 w-3" />
                                Space
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="mt-4">
                            <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-lg border border-slate-200">
                                {!hasContext ? (
                                    <div className="flex items-center justify-center py-12 px-4 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            No context available. Open a task within a space or workspace.
                                        </p>
                                    </div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="flex items-center justify-center py-12 px-4 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            {searchQuery ? 'No matching items' : 'No items available'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredItems.map((item: any) => {
                                        const selected = isSelected(item.type, item.id);
                                        return (
                                            <button
                                                key={`${item.type}-${item.id}`}
                                                onClick={() => handleItemClick(item)}
                                                className={cn(
                                                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                                                    'hover:bg-slate-50',
                                                    selected && 'bg-slate-50'
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                                                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-300'
                                                    )}
                                                >
                                                    {selected && <Check className="h-3 w-3" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium">@{item.name}</p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {item.type}
                                                        </Badge>
                                                    </div>
                                                    {item.description && (
                                                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

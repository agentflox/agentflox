"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Briefcase, Folder, Users, Rocket, Package, 
  Wrench, FileText, Search, Loader2
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ContextKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContexts: Record<string, any[]>;
  onSelect: (contexts: Record<string, any[]>) => void;
}

export const ContextKnowledgeModal: React.FC<ContextKnowledgeModalProps> = ({
  open,
  onOpenChange,
  selectedContexts,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<Record<string, any[]>>(selectedContexts || {});

  const { data: user } = trpc.user.me.useQuery(undefined, { enabled: open });
  const userId = user?.id;

  // Fetch user-owned items
  const { data: projects, isLoading: loadingProjects } = trpc.project.list.useQuery(
    { scope: 'owned' },
    { enabled: open && !!userId }
  );

  const { data: workspaces, isLoading: loadingWorkspaces } = trpc.workspace.list.useQuery(
    { scope: 'owned' },
    { enabled: open && !!userId }
  );

  const { data: teams, isLoading: loadingTeams } = trpc.team.list.useQuery(
    { scope: 'owned' },
    { enabled: open && !!userId }
  );

  const { data: proposals, isLoading: loadingProposals } = trpc.proposal.list.useQuery(
    { scope: 'owned' },
    { enabled: open && !!userId }
  );

  const { data: spaces, isLoading: loadingSpaces } = trpc.space.list.useQuery(
    {},
    { enabled: open && !!userId }
  );

  // Note: These routers may not exist yet, so we'll handle gracefully
  const tools = { items: [], isLoading: false };
  const materials = { items: [], isLoading: false };
  const documents = { items: [], isLoading: false };

  const loadingTools = tools.isLoading;
  const loadingMaterials = materials.isLoading;
  const loadingDocuments = documents.isLoading;

  const handleToggleItem = (type: string, item: any) => {
    const current = localSelected[type] || [];
    const exists = current.some((i: any) => i.id === item.id);
    
    const updated = {
      ...localSelected,
      [type]: exists
        ? current.filter((i: any) => i.id !== item.id)
        : [...current, item],
    };

    // Remove empty arrays
    if (updated[type].length === 0) {
      delete updated[type];
    }

    setLocalSelected(updated);
  };

  const handleApply = () => {
    onSelect(localSelected);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalSelected(selectedContexts || {});
    onOpenChange(false);
  };

  const filterItems = (items: any[]) => {
    if (!searchQuery) return items || [];
    const query = searchQuery.toLowerCase();
    return (items || []).filter((item: any) =>
      (item.name || item.title || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query)
    );
  };

  const renderItemList = (
    items: any[],
    isLoading: boolean,
    type: string,
    icon: React.ElementType
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    const filtered = filterItems(items || []);
    const selected = localSelected[type] || [];

    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No items found
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filtered.map((item: any) => {
          const isSelected = selected.some((s: any) => s.id === item.id);
          const Icon = icon;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleToggleItem(type, item)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggleItem(type, item)}
              />
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.name || item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                )}
              </div>
              {isSelected && (
                <Badge variant="secondary" className="text-xs">
                  Selected
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const totalSelected = Object.values(localSelected).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Knowledge / Context</DialogTitle>
          <DialogDescription>
            Select items from your workspace to provide context to your agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="projects">
                <Briefcase className="h-4 w-4 mr-1" />
                Projects
              </TabsTrigger>
              <TabsTrigger value="workspaces">
                <Folder className="h-4 w-4 mr-1" />
                Workspaces
              </TabsTrigger>
              <TabsTrigger value="teams">
                <Users className="h-4 w-4 mr-1" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="proposals">
                <Rocket className="h-4 w-4 mr-1" />
                Proposals
              </TabsTrigger>
              <TabsTrigger value="spaces">
                <Folder className="h-4 w-4 mr-1" />
                Spaces
              </TabsTrigger>
              <TabsTrigger value="tools">
                <Wrench className="h-4 w-4 mr-1" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="materials">
                <Package className="h-4 w-4 mr-1" />
                Materials
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-1" />
                Docs
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="projects" className="mt-0">
                {renderItemList(
                  (projects as any)?.items || [],
                  loadingProjects,
                  'projects',
                  Briefcase
                )}
              </TabsContent>

              <TabsContent value="workspaces" className="mt-0">
                {renderItemList(
                  (workspaces as any)?.items || [],
                  loadingWorkspaces,
                  'workspaces',
                  Folder
                )}
              </TabsContent>

              <TabsContent value="teams" className="mt-0">
                {renderItemList(
                  (teams as any)?.items || [],
                  loadingTeams,
                  'teams',
                  Users
                )}
              </TabsContent>

              <TabsContent value="proposals" className="mt-0">
                {renderItemList(
                  (proposals as any)?.items || [],
                  loadingProposals,
                  'proposals',
                  Rocket
                )}
              </TabsContent>

              <TabsContent value="spaces" className="mt-0">
                {renderItemList(
                  (spaces as any)?.items || [],
                  loadingSpaces,
                  'spaces',
                  Folder
                )}
              </TabsContent>

              <TabsContent value="tools" className="mt-0">
                {renderItemList(
                  tools?.items || [],
                  loadingTools,
                  'tools',
                  Wrench
                )}
              </TabsContent>

              <TabsContent value="materials" className="mt-0">
                {renderItemList(
                  materials?.items || [],
                  loadingMaterials,
                  'materials',
                  Package
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                {renderItemList(
                  documents?.items || [],
                  loadingDocuments,
                  'documents',
                  FileText
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleApply}>
                Apply ({totalSelected})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


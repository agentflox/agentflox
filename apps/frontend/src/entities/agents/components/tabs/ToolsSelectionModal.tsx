"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Grid3x3, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface ToolsSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedToolIds: string[];
  onSelect: (toolIds: string[]) => void;
  isLoading?: boolean;
}

export function ToolsSelectionModal({
  open,
  onOpenChange,
  selectedToolIds,
  onSelect,
  isLoading = false,
}: ToolsSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'apps'>('all');
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedToolIds));

  // Fetch system tools
  const { data: systemTools, isLoading: loadingTools } = trpc.agent.getSystemTools.useQuery(
    undefined,
    { enabled: open }
  );

  // Group tools by category
  const groupedTools = useMemo(() => {
    if (!systemTools) return {};

    const groups: Record<string, Tool[]> = {};
    const allTools = systemTools as Tool[];

    allTools.forEach(tool => {
      const category = tool.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tool);
    });

    return groups;
  }, [systemTools]);

  // Filter tools by search and category
  const filteredTools = useMemo(() => {
    if (!systemTools) return [];

    const allTools = systemTools as Tool[];
    let filtered = allTools;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query)
      );
    }

    // Filter by category (apps vs all)
    if (activeCategory === 'apps') {
      // Filter to only app integrations (you can customize this logic)
      filtered = filtered.filter(tool => 
        tool.category === 'INTEGRATION' || 
        tool.name.toLowerCase().includes('gmail') ||
        tool.name.toLowerCase().includes('slack') ||
        tool.name.toLowerCase().includes('calendar')
      );
    }

    return filtered;
  }, [systemTools, searchQuery, activeCategory]);

  // Get popular tools (first 4)
  const popularTools = useMemo(() => {
    return filteredTools.slice(0, 4);
  }, [filteredTools]);

  // Get apps
  const apps = useMemo(() => {
    return filteredTools.filter(tool => 
      tool.category === 'INTEGRATION' || 
      tool.name.toLowerCase().includes('gmail') ||
      tool.name.toLowerCase().includes('slack') ||
      tool.name.toLowerCase().includes('calendar')
    );
  }, [filteredTools]);

  const handleToggleTool = (toolId: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  const handleApply = () => {
    onSelect(Array.from(localSelected));
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalSelected(new Set(selectedToolIds));
    onOpenChange(false);
  };

  const getToolIcon = (tool: Tool) => {
    // Return appropriate icon based on tool name/category
    return '🔧';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add tool</DialogTitle>
          <DialogDescription>
            Discover and add tools to your agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid3x3 className="w-4 h-4 inline mr-2" />
              All
            </button>
            <button
              onClick={() => setActiveCategory('apps')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === 'apps'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Apps
            </button>
          </div>

          {/* Tools List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-6 pr-4">
              {/* Popular Section */}
              {activeCategory === 'all' && popularTools.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Popular</h3>
                  <div className="space-y-2">
                    {popularTools.map(tool => {
                      const isSelected = localSelected.has(tool.id);
                      return (
                        <div
                          key={tool.id}
                          onClick={() => handleToggleTool(tool.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-2xl">{getToolIcon(tool)}</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tool.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tool.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              Added
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Apps Section */}
              {activeCategory === 'apps' && apps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Apps</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {apps.map(tool => {
                      const isSelected = localSelected.has(tool.id);
                      return (
                        <div
                          key={tool.id}
                          onClick={() => handleToggleTool(tool.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-xl">{getToolIcon(tool)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tool.name}</p>
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              Added
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Tools Section */}
              {activeCategory === 'all' && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">All tools</h3>
                  <div className="space-y-2">
                    {filteredTools.map(tool => {
                      const isSelected = localSelected.has(tool.id);
                      return (
                        <div
                          key={tool.id}
                          onClick={() => handleToggleTool(tool.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-lg">{getToolIcon(tool)}</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tool.name}</p>
                            {tool.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {tool.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              Added
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredTools.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {loadingTools ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    'No tools found'
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {localSelected.size} tool{localSelected.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={isLoading || loadingTools}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add (${localSelected.size})`
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


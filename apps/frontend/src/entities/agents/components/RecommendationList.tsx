"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  UserPlus,
  Star,
  TrendingUp,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RecommendationListProps {
  items: any[];
  entityType: string;
  workspaceId?: string;
}

type ActionType = 'approve' | 'reject' | 'add_member' | 'view';

export const RecommendationList: React.FC<RecommendationListProps> = ({
  items,
  entityType,
  workspaceId,
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)));
    }
  };

  const handleAction = async (action: ActionType, item: any) => {
    setActionLoading(`${action}-${item.id}`);
    try {
      switch (action) {
        case 'approve':
          // Add approval logic here
          toast.success(`Approved: ${item.name || item.title}`);
          break;
        case 'reject':
          // Add rejection logic here
          toast.success(`Rejected: ${item.name || item.title}`);
          break;
        case 'add_member':
          if (entityType === 'users') {
            // Add member to workspace/team
            toast.success(`Added ${item.name} to workspace`);
          }
          break;
        case 'view':
          // Navigate to item detail page
          window.open(`/marketplace/${entityType}/${item.id}`, '_blank');
          break;
      }
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: ActionType) => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item');
      return;
    }

    setActionLoading(`bulk-${action}`);
    try {
      const selected = items.filter((item) => selectedItems.has(item.id));
      for (const item of selected) {
        await handleAction(action, item);
      }
      toast.success(`Applied ${action} to ${selected.length} items`);
      setSelectedItems(new Set());
    } catch (error: any) {
      toast.error(error.message || 'Bulk action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getEntityIcon = () => {
    switch (entityType) {
      case 'projects':
        return '🚀';
      case 'teams':
        return '👥';
      case 'users':
        return '👤';
      case 'resources':
        return '📦';
      default:
        return '📋';
    }
  };

  const formatMatchScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {getEntityIcon()} Recommendations ({items.length})
            </CardTitle>
            <CardDescription>
              Best matches found based on your criteria
            </CardDescription>
          </div>
          {items.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedItems.size > 0 && (
                <>
                  {entityType === 'users' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleBulkAction('add_member')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading?.startsWith('bulk-add_member') ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Add Selected ({selectedItems.size})
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleBulkAction('approve')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading?.startsWith('bulk-approve') ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve ({selectedItems.size})
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`transition-all ${
                selectedItems.has(item.id)
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {item.name || item.title || item.username || 'Untitled'}
                          </h4>
                          {item.matchScore !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {formatMatchScore(item.matchScore)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description || item.bio || 'No description'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.tags?.slice(0, 3).map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.industry && (
                            <Badge variant="outline" className="text-xs">
                              {item.industry}
                            </Badge>
                          )}
                          {item.skills?.slice(0, 2).map((skill: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{item.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction('view', item)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      {entityType === 'users' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('add_member', item)}
                          disabled={actionLoading === `add_member-${item.id}`}
                        >
                          {actionLoading === `add_member-${item.id}` ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                          )}
                          Add Member
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('approve', item)}
                        disabled={actionLoading === `approve-${item.id}`}
                      >
                        {actionLoading === `approve-${item.id}` ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('reject', item)}
                        disabled={actionLoading === `reject-${item.id}`}
                      >
                        {actionLoading === `reject-${item.id}` ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};


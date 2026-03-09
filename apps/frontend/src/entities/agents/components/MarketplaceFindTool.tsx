"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Filter, Loader2, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { RecommendationList } from './RecommendationList';

interface MarketplaceFindToolProps {
  onAddToTools?: (toolConfig: any) => void;
  workspaceId?: string;
}

type EntityType = 'projects' | 'teams' | 'users' | 'resources' | 'proposals' | 'tools' | 'materials';

interface SearchCriteria {
  entityType: EntityType;
  query: string;
  filters: {
    industry?: string[];
    skills?: string[];
    location?: string;
    availability?: string;
    budget?: { min?: number; max?: number };
    experience?: string;
    rating?: number;
    tags?: string[];
  };
  metrics: {
    relevance?: number;
    quality?: number;
    matchScore?: number;
  };
}

export const MarketplaceFindTool: React.FC<MarketplaceFindToolProps> = ({
  onAddToTools,
  workspaceId,
}) => {
  const [open, setOpen] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    entityType: 'projects',
    query: '',
    filters: {},
    metrics: {},
  });
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [toolAdded, setToolAdded] = useState(false);

  const searchProjects = trpc.marketplace.searchProjects.useMutation();
  const searchTeams = trpc.marketplace.searchTeams.useQuery(
    {
      query: searchCriteria.query,
      teamType: searchCriteria.filters.skills?.[0] as any,
      industry: searchCriteria.filters.industry,
      limit: 20,
    },
    { enabled: false }
  );
  const searchUsers = trpc.marketplace.searchUsers.useQuery(
    {
      query: searchCriteria.query,
      skills: searchCriteria.filters.skills,
      location: searchCriteria.filters.location,
      limit: 20,
    },
    { enabled: false }
  );

  const handleSearch = async () => {
    if (!searchCriteria.query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      let results: any[] = [];

      switch (searchCriteria.entityType) {
        case 'projects':
          const projectResults = await searchProjects.mutateAsync({
            query: searchCriteria.query,
            advancedAi: true,
            limit: 20,
            filters: searchCriteria.filters,
          });
          results = Array.isArray(projectResults) ? projectResults : projectResults.items || [];
          break;
        case 'teams':
          const teamData = await searchTeams.refetch();
          results = Array.isArray(teamData.data?.items) ? teamData.data.items : [];
          break;
        case 'users':
          const userData = await searchUsers.refetch();
          results = Array.isArray(userData.data?.items) ? userData.data.items : [];
          break;
        default:
          toast.error(`Search for ${searchCriteria.entityType} is not yet implemented`);
          setIsSearching(false);
          return;
      }

      // Apply scoring and sorting based on metrics
      const scoredResults = results.map((item, index) => ({
        ...item,
        matchScore: calculateMatchScore(item, searchCriteria),
        rank: index + 1,
      }));

      scoredResults.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      setRecommendations(scoredResults);
      toast.success(`Found ${scoredResults.length} matches`);
    } catch (error: any) {
      toast.error(error.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const calculateMatchScore = (item: any, criteria: SearchCriteria): number => {
    let score = 0;
    
    // Base relevance from query match
    if (criteria.query) {
      const queryLower = criteria.query.toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(queryLower) ? 0.3 : 0;
      const descMatch = (item.description || '').toLowerCase().includes(queryLower) ? 0.2 : 0;
      score += nameMatch + descMatch;
    }

    // Filter matches
    if (criteria.filters.industry && item.industry) {
      if (criteria.filters.industry.includes(item.industry)) score += 0.2;
    }

    if (criteria.filters.tags && item.tags) {
      const matchingTags = item.tags.filter((tag: string) => 
        criteria.filters.tags?.includes(tag)
      ).length;
      score += (matchingTags / (criteria.filters.tags?.length || 1)) * 0.2;
    }

    // Metrics
    if (criteria.metrics.relevance) {
      score += (criteria.metrics.relevance / 100) * 0.1;
    }

    return Math.min(score, 1.0);
  };

  const handleAddTool = () => {
    const toolConfig = {
      name: 'marketplace_find',
      type: 'MARKETPLACE_SEARCH',
      description: `Find best matches from marketplace for ${searchCriteria.entityType}`,
      config: {
        entityType: searchCriteria.entityType,
        criteria: searchCriteria,
        recommendations: recommendations,
      },
    };

    if (onAddToTools) {
      onAddToTools(toolConfig);
    }
    setToolAdded(true);
    toast.success('Marketplace Find tool added to agent');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Search className="h-4 w-4 mr-2" />
          Add Marketplace Find Tool
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Marketplace Find Tool</DialogTitle>
          <DialogDescription>
            Set up criteria for finding the best matches from the marketplace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Entity Type Selection */}
          <div className="space-y-2">
            <Label>What are you looking for?</Label>
            <Select
              value={searchCriteria.entityType}
              onValueChange={(value) =>
                setSearchCriteria((prev) => ({ ...prev, entityType: value as EntityType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="projects">Projects</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
                <SelectItem value="users">Users / Members</SelectItem>
                <SelectItem value="resources">Resources</SelectItem>
                <SelectItem value="proposals">Proposals</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Query */}
          <div className="space-y-2">
            <Label>Search Query</Label>
            <Input
              placeholder="Describe what you're looking for..."
              value={searchCriteria.query}
              onChange={(e) =>
                setSearchCriteria((prev) => ({ ...prev, query: e.target.value }))
              }
            />
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters & Criteria
              </CardTitle>
              <CardDescription>
                Specify what criteria items should match
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {searchCriteria.entityType === 'projects' && (
                <>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input
                      placeholder="e.g., Technology, Healthcare, Finance"
                      value={searchCriteria.filters.industry?.join(', ') || ''}
                      onChange={(e) =>
                        setSearchCriteria((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            industry: e.target.value.split(',').map((s) => s.trim()),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <Input
                      placeholder="Comma-separated tags"
                      value={searchCriteria.filters.tags?.join(', ') || ''}
                      onChange={(e) =>
                        setSearchCriteria((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            tags: e.target.value.split(',').map((s) => s.trim()),
                          },
                        }))
                      }
                    />
                  </div>
                </>
              )}

              {searchCriteria.entityType === 'users' && (
                <>
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <Input
                      placeholder="e.g., React, Python, Design"
                      value={searchCriteria.filters.skills?.join(', ') || ''}
                      onChange={(e) =>
                        setSearchCriteria((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            skills: e.target.value.split(',').map((s) => s.trim()),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Availability</Label>
                    <Select
                      value={searchCriteria.filters.availability || ''}
                      onValueChange={(value) =>
                        setSearchCriteria((prev) => ({
                          ...prev,
                          filters: { ...prev.filters, availability: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                        <SelectItem value="FLEXIBLE">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {searchCriteria.entityType === 'teams' && (
                <>
                  <div className="space-y-2">
                    <Label>Team Type</Label>
                    <Input
                      placeholder="e.g., Development, Marketing, Design"
                      value={searchCriteria.filters.skills?.join(', ') || ''}
                      onChange={(e) =>
                        setSearchCriteria((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            skills: e.target.value.split(',').map((s) => s.trim()),
                          },
                        }))
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matching Metrics</CardTitle>
              <CardDescription>
                Define how matches should be scored and ranked
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Relevance Weight (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={searchCriteria.metrics.relevance || 50}
                  onChange={(e) =>
                    setSearchCriteria((prev) => ({
                      ...prev,
                      metrics: {
                        ...prev.metrics,
                        relevance: parseInt(e.target.value) || 50,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Quality Weight (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={searchCriteria.metrics.quality || 30}
                  onChange={(e) =>
                    setSearchCriteria((prev) => ({
                      ...prev,
                      metrics: {
                        ...prev.metrics,
                        quality: parseInt(e.target.value) || 30,
                      },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Search Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchCriteria.query.trim()}
              className="flex-1"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Find Matches
                </>
              )}
            </Button>
            {recommendations.length > 0 && !toolAdded && (
              <Button onClick={handleAddTool} variant="default">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Add Tool to Agent
              </Button>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <RecommendationList
              items={recommendations}
              entityType={searchCriteria.entityType}
              workspaceId={workspaceId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


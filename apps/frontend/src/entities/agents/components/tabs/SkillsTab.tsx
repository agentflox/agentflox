"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SkillsTabProps {
  agentId: string;
  isReconfiguring: boolean;
  onUpdate: () => void;
}

export function SkillsTab({
  agentId,
  isReconfiguring,
  onUpdate,
}: SkillsTabProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  const {
    data: agentSkills,
    isLoading: loadingAgentSkills,
  } = trpc.agent.getAgentSkills.useQuery(
    { agentId },
    { refetchOnWindowFocus: false },
  );

  const {
    data: allSkills,
    isLoading: loadingAllSkills,
  } = trpc.agent.listSkills.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const addSkillMutation = trpc.agent.addSkill.useMutation();
  const removeSkillMutation = trpc.agent.removeSkill.useMutation();

  const currentSkillIds = useMemo(
    () => new Set((agentSkills || []).map((s) => s.skillId)),
    [agentSkills],
  );

  useEffect(() => {
    setLocalSelected(new Set(currentSkillIds));
  }, [currentSkillIds, manageOpen]);

  const handleToggleSkill = (skillId: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const handleApply = async () => {
    const selected = localSelected;
    const toAdd: string[] = [];
    const toRemove: string[] = [];

    (allSkills || []).forEach((skill) => {
      const id = skill.id;
      const hasBefore = currentSkillIds.has(id);
      const hasAfter = selected.has(id);
      if (!hasBefore && hasAfter) {
        toAdd.push(id);
      } else if (hasBefore && !hasAfter) {
        toRemove.push(id);
      }
    });

    try {
      await Promise.all([
        ...toAdd.map((skillId) =>
          addSkillMutation.mutateAsync({ agentId, skillId }),
        ),
        ...toRemove.map((skillId) =>
          removeSkillMutation.mutateAsync({ agentId, skillId }),
        ),
      ]);

      await Promise.all([
        utils.agent.getAgentSkills.invalidate({ agentId }),
        utils.agent.get.invalidate({ id: agentId }),
      ]);

      onUpdate();
      toast.success("Skills updated");
      setManageOpen(false);
    } catch (error) {
      console.error("Failed to update skills", error);
      toast.error("Failed to update skills");
    }
  };

  const handleRemoveSingle = async (skillId: string) => {
    try {
      await removeSkillMutation.mutateAsync({ agentId, skillId });
      await Promise.all([
        utils.agent.getAgentSkills.invalidate({ agentId }),
        utils.agent.get.invalidate({ id: agentId }),
      ]);
      onUpdate();
      toast.success("Skill removed");
    } catch (error) {
      console.error("Failed to remove skill", error);
      toast.error("Failed to remove skill");
    }
  };

  const hasSkills = (agentSkills && agentSkills.length > 0) || false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Agent Skills
              </CardTitle>
              <CardDescription>
                Capabilities and skills this agent has been equipped with.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isReconfiguring && (
                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Updating
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManageOpen(true)}
                disabled={loadingAgentSkills || loadingAllSkills || isReconfiguring}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                Manage
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAgentSkills ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Loading skills...</span>
            </div>
          ) : hasSkills ? (
            <div className="flex flex-wrap gap-2">
              {(agentSkills || []).map((skill) => (
                <Badge
                  key={skill.skillId}
                  variant="secondary"
                  className="px-3 py-1 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 flex items-center gap-1"
                >
                  {skill.displayName || skill.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveSingle(skill.skillId)}
                    disabled={isReconfiguring || removeSkillMutation.isLoading}
                    className="ml-1 rounded-full hover:bg-purple-100 focus:outline-none"
                    aria-label={`Remove ${skill.displayName || skill.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No skills defined for this agent yet.</p>
              <p className="text-xs mt-1">
                Skills explain what the agent is capable of doing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage skills</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingAllSkills ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Loading available skills...</span>
              </div>
            ) : (allSkills && allSkills.length > 0) ? (
              <>
                <ScrollArea className="max-h-80 pr-2">
                  <div className="space-y-2">
                    {allSkills.map((skill) => {
                      const checked = localSelected.has(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handleToggleSkill(skill.id)}
                          className="w-full flex items-start gap-3 rounded-lg border px-3 py-2 text-left hover:border-purple-300 hover:bg-purple-50/40 transition-colors"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => handleToggleSkill(skill.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {skill.displayName || skill.name}
                              </span>
                              {skill.isBuiltIn && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Built-in
                                </Badge>
                              )}
                            </div>
                            {skill.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {skill.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>
                    {localSelected.size} skill{localSelected.size !== 1 ? "s" : ""} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManageOpen(false)}
                      disabled={addSkillMutation.isLoading || removeSkillMutation.isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApply}
                      disabled={addSkillMutation.isLoading || removeSkillMutation.isLoading}
                    >
                      {addSkillMutation.isLoading || removeSkillMutation.isLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No skills are defined in the system yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

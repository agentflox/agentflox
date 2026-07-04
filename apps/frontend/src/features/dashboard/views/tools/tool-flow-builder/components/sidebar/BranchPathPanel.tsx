"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { BranchConditionRuleRow } from "@/entities/tools/components/builder/BranchConditionRuleRow";

import type { BranchConditionGroup, BranchConditionRule } from "@/entities/tools/types/builder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { SidebarPanelProps } from "./types";

export function BranchPathPanel(props: SidebarPanelProps) {
const { api } = props;
  const { selectedSubBranchId, selectedStepId, steps, setSteps, buildVarTree } = api;

  return (
<div className="flex-1 overflow-y-auto w-full pt-1">
                        <Tabs defaultValue="condition" className="w-full">
                          <TabsList className="w-full justify-start rounded-none border-b border-zinc-200 bg-transparent p-0">
                            <TabsTrigger
                              value="condition"
                              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 font-semibold text-sm"
                            >
                              Branch Condition
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="condition" className="p-4 w-full">
                            {(() => {
                              const step = steps.find((s) => s.id === selectedStepId);
                              if (!step || !selectedSubBranchId) {
                                return null;
                              }

                              let cfg: any = {};
                              try {
                                cfg = JSON.parse(step.config || "{}");
                              } catch {
                                cfg = {};
                              }
                              const branches: any[] = Array.isArray(cfg.branches) ? cfg.branches : [];
                              const branchIdx = branches.findIndex((b) => b.id === selectedSubBranchId);
                              const activeBranch = branchIdx >= 0 ? branches[branchIdx] : {};

                              const assessmentMode: "rules" | "code" | "ai" | "fallback" =
                                activeBranch.assessmentMode ?? (branchIdx === 1 ? "fallback" : "rules");
                              const otherHasFallback = branches.some(
                                (b, i) => i !== branchIdx && (b.assessmentMode ?? (i === 1 ? "fallback" : "rules")) === "fallback",
                              );

                              const group: BranchConditionGroup =
                                activeBranch.conditionGroup ?? {
                                  matchMode: "all",
                                  rules: [],
                                };

                              const stepIndex = steps.findIndex((s) => s.id === step.id);
                              const varTree = buildVarTree(stepIndex);

                              const updateBranch = (updater: (b: any) => any) => {
                                setSteps((prev) =>
                                  prev.map((s) => {
                                    if (s.id !== step.id) return s;
                                    let currentCfg: any = {};
                                    try {
                                      currentCfg = JSON.parse(s.config || "{}");
                                    } catch {
                                      currentCfg = {};
                                    }
                                    const currentBranches: any[] = Array.isArray(currentCfg.branches)
                                      ? currentCfg.branches
                                      : [];
                                    const nextBranches = currentBranches.map((b) =>
                                      b.id === selectedSubBranchId ? updater(b) : b,
                                    );
                                    return {
                                      ...s,
                                      config: JSON.stringify(
                                        { ...currentCfg, branches: nextBranches },
                                        null,
                                        2,
                                      ),
                                    };
                                  }),
                                );
                              };

                              const handleAssessmentChange = (val: string) => {
                                updateBranch((b) => ({ ...b, assessmentMode: val }));
                              };

                              const handleMatchChange = (val: "all" | "any") => {
                                updateBranch((b) => ({
                                  ...b,
                                  conditionGroup: { ...(b.conditionGroup ?? group), matchMode: val },
                                }));
                              };

                              const handleRuleUpdate = (
                                id: string,
                                patch: Partial<BranchConditionRule>,
                              ) => {
                                updateBranch((b) => {
                                  const existing: BranchConditionGroup =
                                    b.conditionGroup ?? group;
                                  const rules = (existing.rules ?? []).map((r: BranchConditionRule) =>
                                    r.id === id ? { ...r, ...patch } : r,
                                  );
                                  return {
                                    ...b,
                                    conditionGroup: { ...existing, rules },
                                  };
                                });
                              };

                              const handleRuleRemove = (id: string) => {
                                updateBranch((b) => {
                                  const existing: BranchConditionGroup =
                                    b.conditionGroup ?? group;
                                  const rules = (existing.rules ?? []).filter(
                                    (r: BranchConditionRule) => r.id !== id,
                                  );
                                  return {
                                    ...b,
                                    conditionGroup: { ...existing, rules },
                                  };
                                });
                              };

                              const handleAddCondition = () => {
                                const newRule: BranchConditionRule = {
                                  id: crypto.randomUUID(),
                                  leftVariable: "",
                                  leftLabel: "",
                                  operator: "equals",
                                  rightValue: "",
                                  rightLabel: "",
                                };
                                updateBranch((b) => {
                                  const existing: BranchConditionGroup =
                                    b.conditionGroup ?? group;
                                  const rules = [...(existing.rules ?? []), newRule];
                                  return {
                                    ...b,
                                    conditionGroup: { ...existing, rules },
                                  };
                                });
                              };

                              return (
                                <div className="space-y-4">
                                  <div>
                                    <div className="text-sm font-semibold mb-2">
                                      Assessment mode
                                    </div>
                                    <Select
                                      value={assessmentMode}
                                      onValueChange={handleAssessmentChange}
                                    >
                                      <SelectTrigger className="w-[260px] h-[36px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="rules">Rules</SelectItem>
                                        <SelectItem value="code">Code expression</SelectItem>
                                        <SelectItem value="ai">Let AI decide</SelectItem>
                                        {(!otherHasFallback ||
                                          assessmentMode === "fallback") && (
                                            <SelectItem value="fallback">
                                              Fallback (if no other branches run)
                                            </SelectItem>
                                          )}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Only show match/conditions when not in fallback mode */}
                                  {assessmentMode !== "fallback" && (() => {
                                    const effectiveGroup: BranchConditionGroup = {
                                      matchMode: group.matchMode,
                                      rules: group.rules ?? [],
                                    };

                                    return (
                                      <>
                                        <div className="flex items-center gap-2 mt-6 mb-2">
                                          <span className="text-sm font-medium text-zinc-700">
                                            Match
                                          </span>
                                          <Select
                                            value={effectiveGroup.matchMode}
                                            onValueChange={(val) =>
                                              handleMatchChange(val as "all" | "any")
                                            }
                                          >
                                            <SelectTrigger className="w-[80px] h-[32px] text-sm">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="all">All</SelectItem>
                                              <SelectItem value="any">Any</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <span className="text-sm font-medium text-zinc-700">
                                            conditions in this group
                                          </span>
                                        </div>

                                        <div className="space-y-3">
                                          {effectiveGroup.rules.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-xs text-zinc-500">
                                              No conditions yet. Add one below to control when this
                                              branch should run.
                                            </div>
                                          ) : (
                                            effectiveGroup.rules.map((rule) => (
                                              <BranchConditionRuleRow
                                                key={rule.id}
                                                rule={rule}
                                                varTree={varTree}
                                                onUpdate={(patch) =>
                                                  handleRuleUpdate(rule.id, patch)
                                                }
                                                onRemove={() => handleRuleRemove(rule.id)}
                                              />
                                            ))
                                          )}
                                        </div>

                                        <div className="pt-1">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleAddCondition}
                                            className="text-zinc-600 hover:text-zinc-900 border border-transparent hover:bg-zinc-100 flex items-center h-8 font-medium"
                                          >
                                            <Plus className="h-4 w-4 mr-1.5" /> Add condition
                                          </Button>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              );
                            })()}
                          </TabsContent>
                        </Tabs>
                      </div>
  );
}

"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, FolderKanban, Users, Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChipGroup } from "@/components/ui/chip";

export interface SelectedMember {
  id: string;
  name: string;
  email?: string;
  image?: string;
  source: "workspace" | "project" | "team" | "space";
  sourceName?: string;
}

export interface GroupOption {
  id: string;
  name: string;
  type: "project" | "team" | "space";
  memberCount?: number;
}

function SidebarShell({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={cn(
      "absolute inset-y-4 rounded-md right-0 z-[60] w-auto min-w-[24rem] max-w-md transform bg-white shadow-[0_0_40px_rgba(0,0,0,0.08)] transition-transform duration-300 border border-slate-200/60 flex flex-col overflow-hidden",
      open ? "-translate-x-14" : "translate-x-full"
    )}>
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 py-4">
        <span className="text-base font-semibold tracking-tight text-slate-900">{title}</span>
        <button className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 pb-8 space-y-6 bg-white">{children}</div>
    </div>
  );
}

function ChipList({ title, members, onRemove }: { title: string; members: SelectedMember[]; onRemove?: (id: string) => void }) {
  if (members.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title} ({members.length})</p>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <Badge key={member.id} variant="secondary" className="flex items-center gap-1.5 pr-1">
            <Avatar className="h-4 w-4">
              <AvatarImage src={member.image} />
              <AvatarFallback className="text-[10px]">{member.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs">{member.name}</span>
            {onRemove && (
              <button onClick={() => onRemove(member.id)} className="ml-1 rounded-full hover:bg-slate-200">
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ChannelAddMembersSidebar({
  open,
  onClose,
  searchQuery,
  onSearchQuery,
  stagedMembers,
  onRemoveStaged,
  filteredIndividuals,
  alreadyInChat,
  onStageMember,
  groupOptions,
  onIncludeGroup,
  onCommit,
}: {
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQuery: (q: string) => void;
  stagedMembers: SelectedMember[];
  onRemoveStaged: (id: string) => void;
  filteredIndividuals: SelectedMember[];
  alreadyInChat: (id: string) => boolean;
  onStageMember: (m: SelectedMember) => void;
  groupOptions: GroupOption[];
  onIncludeGroup: (group: GroupOption) => void;
  onCommit: () => void;
}) {
  const [selectedIndividuals, setSelectedIndividuals] = useState<SelectedMember[]>([]);
  const [selectedProjectGroups, setSelectedProjectGroups] = useState<GroupOption[]>([]);
  const [selectedTeamGroups, setSelectedTeamGroups] = useState<GroupOption[]>([]);
  const [selectedSpaceGroups, setSelectedSpaceGroups] = useState<GroupOption[]>([]);

  const addIndividual = (m: SelectedMember) => {
    if (alreadyInChat(m.id) || selectedIndividuals.find((x) => x.id === m.id)) return;
    setSelectedIndividuals((prev) => [...prev, m]);
  };
  const removeIndividual = (id: string) => setSelectedIndividuals((prev) => prev.filter((x) => x.id !== id));

  const toggleGroup = (group: GroupOption) => {
    const setFn = group.type === "project" ? setSelectedProjectGroups : group.type === "team" ? setSelectedTeamGroups : setSelectedSpaceGroups;
    const cur = group.type === "project" ? selectedProjectGroups : group.type === "team" ? selectedTeamGroups : selectedSpaceGroups;
    const exists = cur.find((g) => g.id === group.id);
    if (exists) setFn(cur.filter((g) => g.id !== group.id));
    else setFn([...cur, group]);
  };
  const clearAll = () => {
    setSelectedIndividuals([]);
    setSelectedProjectGroups([]);
    setSelectedTeamGroups([]);
    setSelectedSpaceGroups([]);
  };

  const handleAddAll = async () => {
    selectedIndividuals.forEach((m) => onStageMember(m));
    for (const g of [...selectedProjectGroups, ...selectedTeamGroups, ...selectedSpaceGroups]) {
      await onIncludeGroup(g);
    }
    clearAll();
    onCommit();
  };

  return (
    <SidebarShell title="Add members" open={open} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50/50 px-3 shadow-sm transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <Input
            variant="ghost"
            placeholder="Search individuals"
            value={searchQuery}
            onChange={(e) => onSearchQuery(e.target.value)}
            className="h-full border-0 bg-transparent pl-2 pr-0 focus:outline-none focus-visible:ring-0 shadow-none"
          />
        </div>

        <Accordion type="multiple" className="w-full">
          <AccordionItem value="individuals">
            <AccordionTrigger>Individuals</AccordionTrigger>
            <AccordionContent>
              <ChipGroup
                chips={selectedIndividuals.map((m) => ({ id: m.id, label: m.name, onRemove: () => removeIndividual(m.id) }))}
                onClearAll={() => setSelectedIndividuals([])}
              />
              <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                {filteredIndividuals.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No members found</p>
                ) : (
                  filteredIndividuals.map((member) => {
                    const isSelected = alreadyInChat(member.id) || selectedIndividuals.some((m) => m.id === member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => addIndividual(member)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                          isSelected
                            ? "bg-indigo-50 border border-indigo-100 cursor-default"
                            : "hover:bg-slate-50 border border-transparent hover:border-slate-100 hover:shadow-sm cursor-pointer"
                        )}
                        disabled={isSelected}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.image} />
                          <AvatarFallback className={cn("text-sm font-semibold", isSelected ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600")}>
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-medium", isSelected ? "text-indigo-700" : "text-foreground")}>{member.name}</p>
                          {member.sourceName && <p className="truncate text-xs text-muted-foreground">{member.sourceName}</p>}
                        </div>
                        {isSelected && (
                          <span className="shrink-0 text-xs font-semibold text-indigo-500 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="spaces">
            <AccordionTrigger>Spaces</AccordionTrigger>
            <AccordionContent>
              <ChipGroup
                chips={selectedSpaceGroups.map((g) => ({ id: g.id, label: g.name, onRemove: () => toggleGroup(g) }))}
                onClearAll={() => setSelectedSpaceGroups([])}
              />
              <div className="mt-3 space-y-2">
                {groupOptions.filter((g) => g.type === "space").map((group) => (
                  <Card key={group.id} className="border border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{group.name}</p>
                          {typeof group.memberCount === "number" && (
                            <p className="text-xs text-muted-foreground">{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => toggleGroup(group)}
                        className={cn(
                          "rounded-lg h-8 px-3 text-xs font-semibold transition-all",
                          selectedSpaceGroups.some((g) => g.id === group.id)
                            ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:border-red-300 shadow-none"
                            : "bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0 shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300"
                        )}
                      >
                        {selectedSpaceGroups.some((g) => g.id === group.id) ? "Remove" : "Select"}
                      </Button>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="projects">
            <AccordionTrigger>Projects</AccordionTrigger>
            <AccordionContent>
              <ChipGroup
                chips={selectedProjectGroups.map((g) => ({ id: g.id, label: g.name, onRemove: () => toggleGroup(g) }))}
                onClearAll={() => setSelectedProjectGroups([])}
              />
              <div className="mt-3 space-y-2">
                {groupOptions.filter((g) => g.type === "project").map((group) => (
                  <Card key={group.id} className="border border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{group.name}</p>
                          {typeof group.memberCount === "number" && (
                            <p className="text-xs text-muted-foreground">{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => toggleGroup(group)}
                        className={cn(
                          "rounded-lg h-8 px-3 text-xs font-semibold transition-all",
                          selectedProjectGroups.some((g) => g.id === group.id)
                            ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:border-red-300 shadow-none"
                            : "bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0 shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300"
                        )}
                      >
                        {selectedProjectGroups.some((g) => g.id === group.id) ? "Remove" : "Select"}
                      </Button>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="teams">
            <AccordionTrigger>Teams</AccordionTrigger>
            <AccordionContent>
              <ChipGroup
                chips={selectedTeamGroups.map((g) => ({ id: g.id, label: g.name, onRemove: () => toggleGroup(g) }))}
                onClearAll={() => setSelectedTeamGroups([])}
              />
              <div className="mt-3 space-y-2">
                {groupOptions.filter((g) => g.type === "team").map((group) => (
                  <Card key={group.id} className="border border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{group.name}</p>
                          {typeof group.memberCount === "number" && (
                            <p className="text-xs text-muted-foreground">{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => toggleGroup(group)}
                        className={cn(
                          "rounded-lg h-8 px-3 text-xs font-semibold transition-all",
                          selectedTeamGroups.some((g) => g.id === group.id)
                            ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:border-red-300 shadow-none"
                            : "bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0 shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300"
                        )}
                      >
                        {selectedTeamGroups.some((g) => g.id === group.id) ? "Remove" : "Select"}
                      </Button>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 rounded-xl h-11 font-medium transition-all"
            onClick={clearAll}
          >
            Clear
          </Button>
          <Button
            className="flex-1 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl h-11 font-semibold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all disabled:opacity-40 disabled:shadow-none"
            onClick={handleAddAll}
            disabled={selectedIndividuals.length === 0 && selectedProjectGroups.length === 0 && selectedTeamGroups.length === 0 && selectedSpaceGroups.length === 0}
          >
            Add to chat
          </Button>
        </div>
      </div>
    </SidebarShell>
  );
}

export default ChannelAddMembersSidebar;

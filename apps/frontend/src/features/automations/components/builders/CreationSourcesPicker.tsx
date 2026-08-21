"use client";

import { useMemo, useState } from "react";
import { Info, Plus, X, Users, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { AutomationScope, CreationSourceFilters } from "../../types";

export function CreationSourcesPicker({
  value,
  onChange,
  scope,
}: {
  value: CreationSourceFilters;
  onChange: (next: CreationSourceFilters) => void;
  scope: AutomationScope;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [] } = trpc.workspace.getMembers.useQuery(
    { id: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );

  const { data: agentsData } = trpc.agent.list.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );
  const agents = agentsData?.items || [];

  const { data: teamsData } = trpc.team.list.useQuery(
    { workspaceId: scope.workspaceId || "" },
    { enabled: !!scope.workspaceId }
  );
  const teams = teamsData?.items || [];

  const selectedUserIds = useMemo(() => value.userIds || [], [value.userIds]);

  const toggleUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      onChange({
        ...value,
        userIds: selectedUserIds.filter((x) => x !== id),
      });
    } else {
      onChange({
        ...value,
        userIds: [...selectedUserIds, id],
      });
    }
  };

  const removeUser = (id: string) => {
    onChange({
      ...value,
      userIds: selectedUserIds.filter((x) => x !== id),
    });
  };

  const getUserInfo = (id: string) => {
    if (id === "me") {
      return { name: "Me", initials: "DN", type: "me" };
    }
    const member = members.find((m) => m.user?.id === id || m.id === id);
    if (member) {
      const name = member.user?.name || member.user?.email || "User";
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      return { name, initials: initials || "U", type: "user" };
    }
    const agent = agents.find((a) => a.id === id);
    if (agent) {
      return {
        name: agent.name,
        initials: agent.name.substring(0, 2).toUpperCase(),
        type: "agent",
      };
    }
    const team = teams.find((t) => t.id === id);
    if (team) {
      return {
        name: team.name,
        initials: team.name.substring(0, 2).toUpperCase(),
        type: "team",
      };
    }
    return { name: id, initials: id.substring(0, 2).toUpperCase(), type: "unknown" };
  };

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const lower = search.toLowerCase();
    return members.filter((m) =>
      (m.user?.name || m.user?.email || "").toLowerCase().includes(lower)
    );
  }, [members, search]);

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents;
    const lower = search.toLowerCase();
    return agents.filter((a) => a.name.toLowerCase().includes(lower));
  }, [agents, search]);

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;
    const lower = search.toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(lower));
  }, [teams, search]);

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-zinc-200 bg-white">
      {/* Left side: Users label, info icon, divider, and avatars/picker */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm font-medium text-zinc-800">Users</span>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex text-zinc-400 hover:text-zinc-600">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-zinc-900 text-white text-xs max-w-[240px] text-center p-2 rounded-lg shadow-lg border-0"
              >
                Leave blank to allow all users or click to filter by specific users
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="h-4 w-px bg-zinc-200 shrink-0" />

        {/* Selected users avatar list & Add button */}
        <div className="flex items-center gap-1.5">
          {selectedUserIds.length > 0 && (
            <div className="flex -space-x-1.5 overflow-visible py-1 px-0.5">
              {selectedUserIds.slice(0, 5).map((id) => {
                const info = getUserInfo(id);
                return (
                  <TooltipProvider key={id}>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div className="group/avatar relative inline-block h-6 w-6 select-none shrink-0 hover:z-10">
                          <Avatar className="h-6 w-6 ring-1 ring-white">
                            <AvatarFallback
                              className={cn(
                                "text-[10px] font-semibold text-white",
                                info.type === "agent"
                                  ? "bg-pink-600"
                                  : info.type === "team"
                                  ? "bg-indigo-600"
                                  : "bg-[#475569]"
                              )}
                            >
                              {info.initials}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              removeUser(id);
                            }}
                            className="absolute -bottom-1 -right-1 z-20 bg-red-500 hover:bg-red-600 text-white rounded-full h-4 w-4 hidden group-hover/avatar:flex items-center justify-center cursor-pointer border-[2px] border-white shadow-sm transition-all"
                            title={`Remove ${info.name}`}
                          >
                            <X className="h-3 w-3 scale-70 text-white" strokeWidth={3} />
                          </button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-zinc-900 text-white text-xs py-1 px-2 rounded-md shadow-md border-0"
                      >
                        {info.name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          )}

          {selectedUserIds.length > 5 && (
            <span className="text-xs font-medium text-zinc-600 shrink-0">
              +{selectedUserIds.length - 5}
            </span>
          )}

          {/* Add User Popover Trigger */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-6 w-6 rounded-full border border-dashed border-zinc-300 hover:border-zinc-400 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer shrink-0",
                  open && "border-zinc-500 text-zinc-700"
                )}
                title="Select users"
              >
                {selectedUserIds.length === 0 ? (
                  <div className="relative flex items-center justify-center">
                    <Users className="h-3 w-3" />
                    <span className="text-[8px] font-bold leading-none absolute -bottom-1 -right-1">+</span>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <User className="h-3 w-3" />
                    <span className="text-[8px] font-bold leading-none absolute -bottom-1 -right-1">+</span>
                  </div>
                )}
              </button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[280px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white"
              align="start"
            >
              <Command className="rounded-xl" shouldFilter={false}>
                <div className="p-2 border-b border-zinc-100">
                  <CommandInput
                    placeholder="Search or enter email..."
                    value={search}
                    onValueChange={setSearch}
                    className="text-sm"
                  />
                </div>
                <CommandList className="max-h-[320px] overflow-y-auto p-1 space-y-1">
                  <CommandEmpty>No results found.</CommandEmpty>

                  {/* People */}
                  <CommandGroup heading="People" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider">
                    {/* "Me" option */}
                    {(!search.trim() || "me".includes(search.toLowerCase())) && (
                      <CommandItem
                        value="me"
                        onSelect={() => toggleUser("me")}
                        className={cn(
                          "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-sm group",
                          selectedUserIds.includes("me") && "bg-zinc-50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar className="h-7 w-7 ring-1 ring-white">
                              <AvatarFallback className="text-xs bg-zinc-700 text-white">
                                DN
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                            {selectedUserIds.includes("me") && (
                              <span
                                className="absolute -bottom-1 -right-1 bg-red-500 text-white hover:bg-red-600 rounded-full h-4 w-4 flex items-center justify-center transition-all cursor-pointer border-[2px] border-white shadow-sm opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleUser("me");
                                }}
                              >
                                <X className="h-3 w-3 scale-70 text-white" strokeWidth={3} />
                              </span>
                            )}
                          </div>
                          <span className="text-zinc-900">ME</span>
                        </div>
                      </CommandItem>
                    )}

                    {/* Members */}
                    {filteredMembers.map((member) => {
                      const userId = member.user?.id || member.id;
                      const name = member.user?.name || member.user?.email || "Member";
                      const isSelected = selectedUserIds.includes(userId);
                      const initials = name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <CommandItem
                          key={member.id}
                          value={`member-${userId}`}
                          onSelect={() => toggleUser(userId)}
                          className={cn(
                            "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-sm group",
                            isSelected && "bg-zinc-50"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <Avatar className="h-7 w-7 ring-1 ring-white">
                                <AvatarFallback className="text-xs bg-zinc-200 text-zinc-900">
                                  {initials || "U"}
                                </AvatarFallback>
                              </Avatar>
                              {isSelected && (
                                <span
                                  className="absolute -bottom-1 -right-1 bg-red-500 text-white hover:bg-red-600 rounded-full h-4 w-4 flex items-center justify-center transition-all cursor-pointer border-[2px] border-white shadow-sm opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleUser(userId);
                                  }}
                                >
                                  <X className="h-3 w-3 scale-70 text-white" strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <span className="text-zinc-900">{name}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>

                  {/* Agents */}
                  <CommandGroup heading="Agents" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider">
                    {filteredAgents.map((agent) => {
                      const isSelected = selectedUserIds.includes(agent.id);
                      return (
                        <CommandItem
                          key={agent.id}
                          value={`agent-${agent.id}`}
                          onSelect={() => toggleUser(agent.id)}
                          className={cn(
                            "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-sm group",
                            isSelected && "bg-zinc-50"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <Avatar className="h-7 w-7 ring-1 ring-white">
                                <AvatarFallback className="text-xs bg-pink-100 text-pink-700">
                                  {agent.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                              {isSelected && (
                                <span
                                  className="absolute -bottom-1 -right-1 bg-red-500 text-white hover:bg-red-600 rounded-full h-4 w-4 flex items-center justify-center transition-all cursor-pointer border-[2px] border-white shadow-sm opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleUser(agent.id);
                                  }}
                                >
                                  <X className="h-3 w-3 scale-70 text-white" strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <span className="text-zinc-900">{agent.name}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
                    <CommandItem
                      value="create-agent"
                      onSelect={() => setOpen(false)}
                      className="flex items-center gap-2 py-1.5 px-2.5 mt-1 rounded-lg hover:bg-zinc-100 cursor-pointer text-sm font-medium text-zinc-700 transition-colors"
                    >
                      <span className="rounded-full bg-zinc-200 p-1">
                        <Plus className="h-4 w-4 text-zinc-600" />
                      </span>
                      <span>Create Agent</span>
                    </CommandItem>
                  </CommandGroup>

                  {/* Teams */}
                  {filteredTeams.length > 0 && (
                    <CommandGroup heading="Teams" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider">
                      {filteredTeams.map((team) => {
                        const isSelected = selectedUserIds.includes(team.id);
                        return (
                          <CommandItem
                            key={team.id}
                            value={`team-${team.id}`}
                            onSelect={() => toggleUser(team.id)}
                            className={cn(
                              "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-sm group",
                              isSelected && "bg-zinc-50"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <div className="h-7 w-7 rounded-full bg-zinc-600 text-white flex items-center justify-center text-[10px] font-medium ring-1 ring-white">
                                  {team.name.substring(0, 1).toUpperCase()}
                                </div>
                                {isSelected && (
                                  <span
                                    className="absolute -bottom-1 -right-1 bg-red-500 text-white hover:bg-red-600 rounded-full h-4 w-4 flex items-center justify-center transition-all cursor-pointer border-[2px] border-white shadow-sm opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleUser(team.id);
                                    }}
                                  >
                                    <X className="h-3 w-3 scale-70 text-white" strokeWidth={3} />
                                  </span>
                                )}
                              </div>
                              <span className="text-zinc-900">{team.name}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
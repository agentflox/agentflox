import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Plus, ChevronDown, Check } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { AutomationScope } from "../../types";

export function AssigneeMultiSelect({
  value = [],
  onChange,
  scope,
  peopleOnly = false,
  hideHeading = false,
}: {
  value?: string[];
  onChange: (value: string[]) => void;
  scope?: { workspaceId?: string } | AutomationScope;
  peopleOnly?: boolean;
  hideHeading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [] } = trpc.workspace.getMembers.useQuery(
    { id: scope?.workspaceId || "" },
    { enabled: !!scope?.workspaceId }
  );

  const { data: agentsData } = trpc.agent.list.useQuery(
    { workspaceId: scope?.workspaceId || "" },
    { enabled: !peopleOnly && !!scope?.workspaceId }
  );
  const agents = peopleOnly ? [] : (agentsData?.items || []);

  const { data: teamsData } = trpc.team.list.useQuery(
    { workspaceId: scope?.workspaceId || "" },
    { enabled: !peopleOnly && !!scope?.workspaceId }
  );
  const teams = peopleOnly ? [] : (teamsData?.items || []);

  const toggleValue = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const getEntityInfo = (id: string) => {
    if (id === "me") return { name: "ME", initials: "DN", type: "me" };

    const member = members.find((m) => m.user?.id === id || m.id === id);
    if (member) {
      const name = member.user?.name || member.user?.email || id;
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      return { name, initials: initials || "U", type: "user" };
    }

    const agent = agents.find((a) => a.id === id);
    if (agent) return { name: agent.name, initials: agent.name.substring(0, 2).toUpperCase(), type: "agent" };

    const team = teams.find((t) => t.id === id);
    if (team) return { name: team.name, initials: team.name.substring(0, 2).toUpperCase(), type: "team" };

    return { name: id, initials: id.substring(0, 2).toUpperCase(), type: "unknown" };
  };

  const filteredMembers = members.filter((m) => {
    if (!search.trim()) return true;
    const name = m.user?.name || m.user?.email || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredAgents = agents.filter((a) => {
    if (!search.trim()) return true;
    return a.name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredTeams = teams.filter((t) => {
    if (!search.trim()) return true;
    return t.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm text-zinc-500 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {value.length === 0 ? (
            <span className="text-zinc-400">Select a user</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5 overflow-visible py-1 px-0.5">
                {value.slice(0, 5).map((id) => {
                  const info = getEntityInfo(id);
                  return (
                    <TooltipProvider key={id}>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <div className="group/avatar relative inline-block h-5 w-5 hover:z-10">
                            <Avatar className="h-5 w-5 ring-1 ring-white">
                              <AvatarFallback className="text-[9px] bg-slate-700 text-white font-medium">
                                {info.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className="absolute -bottom-1 -right-1 z-10 h-3.5 w-3.5 bg-red-500 hover:bg-red-600 text-white rounded-full items-center justify-center hidden group-hover/avatar:flex cursor-pointer border border-white shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleValue(id);
                              }}
                            >
                              <X className="h-2 w-2" strokeWidth={3} />
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs py-1 px-2 border-0 bg-zinc-900 text-white rounded-md shadow-md">
                          {info.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
              <span className="text-xs font-medium text-zinc-600">
                {value.length > 5
                  ? `+${value.length - 5}`
                  : value.length === 1
                    ? "1 Assignee"
                    : `${value.length} Assignees`}
              </span>
            </div>
          )}
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white" align="start">
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
            <CommandGroup heading={hideHeading ? undefined : "People"} className={cn("[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider", hideHeading && "[&_[cmdk-group-heading]]:hidden")}>
              {/* "Me" option */}
              {(!search.trim() || "me".includes(search.toLowerCase())) && (
                <CommandItem
                  value="me"
                  onSelect={() => toggleValue("me")}
                  className={cn(
                    "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-sm group",
                    value.includes("me") && "bg-zinc-50"
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
                      {value.includes("me") && (
                        <span
                          className="absolute -bottom-1 -right-1 bg-red-500 text-white hover:bg-red-600 rounded-full h-4 w-4 flex items-center justify-center transition-all cursor-pointer border-[2px] border-white shadow-sm opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleValue("me");
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

              {filteredMembers.map((member) => {
                const userId = member.user?.id || member.id;
                const name = member.user?.name || member.user?.email || "";
                const isSelected = value.includes(userId);
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
                    onSelect={() => toggleValue(userId)}
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
                              toggleValue(userId);
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
            {!peopleOnly && (
              <CommandGroup heading="Agents" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider">
                {filteredAgents.map((agent) => {
                  const isSelected = value.includes(agent.id);
                  return (
                    <CommandItem
                      key={agent.id}
                      value={`agent-${agent.id}`}
                      onSelect={() => toggleValue(agent.id)}
                      className={cn(
                        "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-xs group",
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
                                toggleValue(agent.id);
                              }}
                            >
                              <X className="h-3 w-3 scale-70 text-white" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-900">{agent.name}</span>
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
                    <Plus className="h-4 w-4 text-zinc-700" />
                  </span>
                  <span>Create Agent</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Teams */}
            {!peopleOnly && filteredTeams.length > 0 && (
              <CommandGroup heading="Teams" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider">
                {filteredTeams.map((team) => {
                  const isSelected = value.includes(team.id);
                  return (
                    <CommandItem
                      key={team.id}
                      value={`team-${team.id}`}
                      onSelect={() => toggleValue(team.id)}
                      className={cn(
                        "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-xs group",
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
                                toggleValue(team.id);
                              }}
                            >
                              <X className="h-3 w-3 scale-70 text-white" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-900">{team.name}</span>
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
  );
}

export function AssigneeSingleSelect({
  value,
  onChange,
  scope,
  placeholder = "Select a user",
  peopleOnly = false,
  hideHeading = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  scope?: { workspaceId?: string } | AutomationScope;
  placeholder?: string;
  peopleOnly?: boolean;
  hideHeading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [] } = trpc.workspace.getMembers.useQuery(
    { id: scope?.workspaceId || "" },
    { enabled: !!scope?.workspaceId }
  );

  const { data: agentsData } = trpc.agent.list.useQuery(
    { workspaceId: scope?.workspaceId || "" },
    { enabled: !peopleOnly && !!scope?.workspaceId }
  );
  const agents = peopleOnly ? [] : (agentsData?.items || []);

  const { data: teamsData } = trpc.team.list.useQuery(
    { workspaceId: scope?.workspaceId || "" },
    { enabled: !peopleOnly && !!scope?.workspaceId }
  );
  const teams = peopleOnly ? [] : (teamsData?.items || []);

  const getEntityInfo = (id: string) => {
    if (id === "me") return { name: "ME", initials: "DN", type: "me" };

    const member = members.find((m) => m.user?.id === id || m.id === id);
    if (member) {
      const name = member.user?.name || member.user?.email || id;
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      return { name, initials: initials || "U", type: "user" };
    }

    const agent = agents.find((a) => a.id === id);
    if (agent) return { name: agent.name, initials: agent.name.substring(0, 2).toUpperCase(), type: "agent" };

    const team = teams.find((t) => t.id === id);
    if (team) return { name: team.name, initials: team.name.substring(0, 2).toUpperCase(), type: "team" };

    return { name: id, initials: id.substring(0, 2).toUpperCase(), type: "unknown" };
  };

  const selectedInfo = value ? getEntityInfo(value) : null;

  const filteredMembers = members.filter((m) => {
    if (!search.trim()) return true;
    const name = m.user?.name || m.user?.email || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredAgents = agents.filter((a) => {
    if (!search.trim()) return true;
    return a.name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredTeams = teams.filter((t) => {
    if (!search.trim()) return true;
    return t.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (id: string) => {
    if (value === id) {
      onChange("");
    } else {
      onChange(id);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {!selectedInfo ? (
            <span className="text-zinc-400">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5 ring-1 ring-white shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-[10px] text-white font-medium",
                    selectedInfo.type === "agent"
                      ? "bg-pink-500"
                      : selectedInfo.type === "team"
                      ? "bg-zinc-600"
                      : "bg-slate-700"
                  )}
                >
                  {selectedInfo.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-zinc-900 truncate">
                {selectedInfo.name}
              </span>
            </div>
          )}
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 rounded-xl shadow-xl border-zinc-200 bg-white" align="start">
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
            <CommandGroup heading={hideHeading ? undefined : "People"} className={cn("[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider", hideHeading && "[&_[cmdk-group-heading]]:hidden")}>
              {(!search.trim() || "me".includes(search.toLowerCase())) && (
                <CommandItem
                  value="me"
                  onSelect={() => handleSelect("me")}
                  className={cn(
                    "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-sm",
                    value === "me" && "bg-zinc-50"
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
                    </div>
                    <span className="text-zinc-900">ME</span>
                  </div>
                  {value === "me" && <Check className="h-4 w-4 text-zinc-800" />}
                </CommandItem>
              )}

              {filteredMembers.map((member) => {
                const userId = member.user?.id || member.id;
                const name = member.user?.name || member.user?.email || "";
                const isSelected = value === userId;
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
                    onSelect={() => handleSelect(userId)}
                    className={cn(
                      "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-sm",
                      isSelected && "bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-7 w-7 ring-1 ring-white shrink-0">
                        <AvatarFallback className="text-xs bg-zinc-200 text-zinc-900">
                          {initials || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-zinc-900 truncate">{name}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-zinc-800 shrink-0" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* Agents */}
            {!peopleOnly && (
              <CommandGroup heading="Agents" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider">
                {filteredAgents.map((agent) => {
                  const isSelected = value === agent.id;
                  return (
                    <CommandItem
                      key={agent.id}
                      value={`agent-${agent.id}`}
                      onSelect={() => handleSelect(agent.id)}
                      className={cn(
                        "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-xs",
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
                        </div>
                        <span className="text-xs text-zinc-900 truncate">{agent.name}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-zinc-800 shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Teams */}
            {!peopleOnly && filteredTeams.length > 0 && (
              <CommandGroup heading="Teams" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:tracking-wider">
                {filteredTeams.map((team) => {
                  const isSelected = value === team.id;
                  return (
                    <CommandItem
                      key={team.id}
                      value={`team-${team.id}`}
                      onSelect={() => handleSelect(team.id)}
                      className={cn(
                        "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-100 cursor-pointer text-xs",
                        isSelected && "bg-zinc-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-zinc-600 text-white flex items-center justify-center text-[10px] font-medium ring-1 ring-white shrink-0">
                          {team.name.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="text-xs text-zinc-900 truncate">{team.name}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-zinc-800 shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
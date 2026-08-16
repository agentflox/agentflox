"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { EntityIcon } from "@/entities/shared/components/EntityIcon";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const DEFAULT_COLOR = "#6366F1";
const DEFAULT_ICON = "A";

type AgentIdentity = {
  id: string;
  name?: string | null;
  description?: string | null;
  avatar?: string | null;
  icon?: string | null;
  color?: string | null;
};

function resolveDisplayIcon(agent: AgentIdentity): string {
  if (agent.icon && String(agent.icon).trim()) return String(agent.icon).trim();
  if (agent.avatar && String(agent.avatar).trim()) return String(agent.avatar).trim();
  return DEFAULT_ICON;
}

interface AgentIdentityHeaderProps {
  agent: AgentIdentity;
  onUpdated?: () => void;
  className?: string;
}

export function AgentIdentityHeader({
  agent,
  onUpdated,
  className,
}: AgentIdentityHeaderProps) {
  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: () => {
      onUpdated?.();
    },
    onError: (e) => toast.error(e.message || "Failed to update agent"),
  });

  const [icon, setIcon] = useState(resolveDisplayIcon(agent));
  const [color, setColor] = useState(agent.color || DEFAULT_COLOR);
  const [name, setName] = useState(agent.name || "");
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIcon(resolveDisplayIcon(agent));
    setColor(agent.color || DEFAULT_COLOR);
    setName(agent.name || "");
  }, [agent.id, agent.name, agent.icon, agent.color, agent.avatar]);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  const persist = async (patch: { name?: string; icon?: string; color?: string }) => {
    await updateAgent.mutateAsync({
      id: agent.id,
      ...patch,
    } as any);
  };

  const commitName = async () => {
    const next = name.trim();
    setEditingName(false);
    if (!next) {
      setName(agent.name || "");
      return;
    }
    if (next === agent.name) return;
    try {
      await persist({ name: next });
      toast.success("Name updated");
    } catch {
      setName(agent.name || "");
    }
  };

  const handleIconChange = async (newIcon: string) => {
    setIcon(newIcon || DEFAULT_ICON);
    try {
      await persist({ icon: newIcon || DEFAULT_ICON });
    } catch {
      setIcon(resolveDisplayIcon(agent));
    }
  };

  const handleColorChange = async (newColor: string) => {
    setColor(newColor);
    try {
      await persist({ color: newColor });
    } catch {
      setColor(agent.color || DEFAULT_COLOR);
    }
  };

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <IconColorSelector
        icon={icon}
        color={color}
        entityName={name || "Agent"}
        onIconChange={handleIconChange}
        onColorChange={handleColorChange}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl shrink-0 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm"
          style={{ backgroundColor: color }}
          disabled={updateAgent.isPending}
          title="Change icon"
        >
          <EntityIcon
            icon={icon || DEFAULT_ICON}
            fallback={Bot}
            size={18}
            className="text-white"
            fill
          />
        </Button>
      </IconColorSelector>

      <div className="min-w-0 flex-1">
        {editingName ? (
          <Input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void commitName()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitName();
              }
              if (e.key === "Escape") {
                setName(agent.name || "");
                setEditingName(false);
              }
            }}
            maxLength={255}
            disabled={updateAgent.isPending}
            className="h-7 px-2 text-sm font-extrabold rounded-lg border-zinc-200"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="block w-full text-left min-w-0 cursor-pointer group"
            title="Click to rename"
          >
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 truncate leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {name || "Untitled agent"}
            </h2>
          </button>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate leading-tight mt-1">
          {agent.description || "No description"}
        </p>
      </div>
    </div>
  );
}

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type AgentSettingsSaveHandlers = {
  dirty: boolean;
  save: () => void | Promise<void>;
  discard?: () => void;
  isPending?: boolean;
};

type Registry = Map<string, AgentSettingsSaveHandlers>;

type AgentSettingsSaveContextValue = {
  activeSection: string;
  setActiveSection: (id: string) => void;
  register: (sectionId: string, handlers: AgentSettingsSaveHandlers) => void;
  unregister: (sectionId: string) => void;
  /** True when the active section registered a save handler. */
  hasSaveTarget: boolean;
  dirty: boolean;
  isPending: boolean;
  save: () => void;
  discard: () => void;
};

const AgentSettingsSaveContext = createContext<AgentSettingsSaveContextValue | null>(null);

export function AgentSettingsSaveProvider({
  children,
  activeSection: activeSectionProp,
  onActiveSectionChange,
  initialSection = "instructions",
}: {
  children: React.ReactNode;
  /** Controlled active section (preferred when parent already tracks it). */
  activeSection?: string;
  onActiveSectionChange?: (id: string) => void;
  initialSection?: string;
}) {
  const [internalSection, setInternalSection] = useState(initialSection);
  const activeSection = activeSectionProp ?? internalSection;
  const setActiveSection = useCallback(
    (id: string) => {
      if (onActiveSectionChange) onActiveSectionChange(id);
      else setInternalSection(id);
    },
    [onActiveSectionChange]
  );

  const [registry, setRegistry] = useState<Registry>(() => new Map());
  const registryRef = useRef(registry);
  registryRef.current = registry;

  const register = useCallback((sectionId: string, handlers: AgentSettingsSaveHandlers) => {
    setRegistry((prev) => {
      const existing = prev.get(sectionId);
      if (
        existing &&
        existing.dirty === handlers.dirty &&
        Boolean(existing.isPending) === Boolean(handlers.isPending)
      ) {
        return prev;
      }
      const next = new Map(prev);
      next.set(sectionId, handlers);
      return next;
    });
  }, []);

  const unregister = useCallback((sectionId: string) => {
    setRegistry((prev) => {
      if (!prev.has(sectionId)) return prev;
      const next = new Map(prev);
      next.delete(sectionId);
      return next;
    });
  }, []);

  const current = registry.get(activeSection);
  const hasSaveTarget = Boolean(current);
  const dirty = Boolean(current?.dirty);
  const isPending = Boolean(current?.isPending);

  const save = useCallback(() => {
    const handlers = registryRef.current.get(activeSection);
    void handlers?.save();
  }, [activeSection]);

  const discard = useCallback(() => {
    const handlers = registryRef.current.get(activeSection);
    handlers?.discard?.();
  }, [activeSection]);

  const value = useMemo(
    () => ({
      activeSection,
      setActiveSection,
      register,
      unregister,
      hasSaveTarget,
      dirty,
      isPending,
      save,
      discard,
    }),
    [
      activeSection,
      setActiveSection,
      register,
      unregister,
      hasSaveTarget,
      dirty,
      isPending,
      save,
      discard,
    ]
  );

  return (
    <AgentSettingsSaveContext.Provider value={value}>
      {children}
    </AgentSettingsSaveContext.Provider>
  );
}

export function useAgentSettingsSave() {
  return useContext(AgentSettingsSaveContext);
}

/** Tabs call this to publish dirty/save into the shared header button. */
export function useRegisterAgentSettingsSave(
  sectionId: string,
  handlers: AgentSettingsSaveHandlers,
  enabled = true
) {
  const ctx = useAgentSettingsSave();
  const register = ctx?.register;
  const unregister = ctx?.unregister;
  const saveRef = useRef(handlers.save);
  const discardRef = useRef(handlers.discard);
  saveRef.current = handlers.save;
  discardRef.current = handlers.discard;

  useEffect(() => {
    if (!register || !enabled) return;
    register(sectionId, {
      dirty: handlers.dirty,
      isPending: handlers.isPending,
      save: () => saveRef.current(),
      discard: () => discardRef.current?.(),
    });
  }, [register, sectionId, enabled, handlers.dirty, handlers.isPending]);

  useEffect(() => {
    if (!unregister || !enabled) return;
    return () => unregister(sectionId);
  }, [unregister, sectionId, enabled]);
}

export function SaveChangesButton({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const ctx = useAgentSettingsSave();
  if (!ctx?.hasSaveTarget) return null;

  const { dirty, isPending, save } = ctx;
  const btnH = size === "md" ? "h-10" : "h-9";

  return (
    <Button
      type="button"
      disabled={!dirty || isPending}
      onClick={save}
      className={cn(
        "rounded-xl font-medium transition-colors",
        btnH,
        dirty
          ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
          : "bg-zinc-100 text-zinc-400 hover:bg-zinc-100 cursor-default",
        className
      )}
    >
      {isPending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          Saving…
        </>
      ) : (
        "Save changes"
      )}
    </Button>
  );
}

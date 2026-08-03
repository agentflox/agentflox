"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import type { SidebarPanelProps } from "./types";

export function InputFieldPanel(props: SidebarPanelProps) {
  const { api } = props;
  const { setInputSidebarOpen, setSelectedInputField } = api;

  return (
    <div className="space-y-4">
      <div className="text-xs text-zinc-500">Configure how this input receives its value.</div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        Input configuration panel - bind to variables or set defaults.
      </div>
      <Button variant="outline" size="sm" onClick={() => { setInputSidebarOpen(false); setSelectedInputField(null); }}>
        Done
      </Button>
    </div>
  );
}

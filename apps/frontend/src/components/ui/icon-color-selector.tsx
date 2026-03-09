"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EnhancedIconPicker } from "@/components/ui/enhanced-icon-picker";

interface IconColorSelectorProps {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  spaceId?: string;
  entityName?: string;
  children: React.ReactNode;
}

export function IconColorSelector({ icon, color, onIconChange, onColorChange, spaceId, entityName, children }: IconColorSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none shadow-none bg-transparent" align="start" sideOffset={8}>
        <EnhancedIconPicker
          icon={icon}
          color={color}
          spaceId={spaceId}
          entityName={entityName}
          onIconChange={(newIcon) => {
            onIconChange(newIcon);
            setOpen(false); // Close on icon select
          }}
          onColorChange={onColorChange} // Keep open on color select usually
        />
      </PopoverContent>
    </Popover>
  );
}

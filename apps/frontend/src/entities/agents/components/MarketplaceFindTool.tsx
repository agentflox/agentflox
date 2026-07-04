"use client";

import { Button } from "@/components/ui/button";

interface MarketplaceFindToolProps {
  onAddToTools: (toolConfig: Record<string, unknown>) => void;
}

export function MarketplaceFindTool({ onAddToTools }: MarketplaceFindToolProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onAddToTools({ type: "marketplace_find" })}
    >
      Add Marketplace Find Tool
    </Button>
  );
}

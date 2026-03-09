"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AIMenuProps {
  documentId: string;
  selectedText: string;
  onTextReplacement: (newText: string) => void;
}

export function AIMenu({ documentId, selectedText, onTextReplacement }: AIMenuProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAIOperation = async (operation: string) => {
    if (!selectedText) {
      toast.error("Please select some text first");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/documents/${documentId}/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText,
          operation,
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const data = await response.json();
      
      if (data.result) {
        onTextReplacement(data.result);
        toast.success(`Text ${operation}d successfully`);
      }
    } catch (error) {
      console.error("AI operation error:", error);
      toast.error("Failed to process AI request");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedText || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Assist
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleAIOperation("enhance")}>
          Improve Writing
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAIOperation("expand")}>
          Expand
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAIOperation("summarize")}>
          Summarize
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAIOperation("simplify")}>
          Simplify
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAIOperation("professional")}>
          Make Professional
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAIOperation("casual")}>
          Make Casual
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

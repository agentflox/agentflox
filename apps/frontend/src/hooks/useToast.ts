import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = useCallback(({ title, description, variant = "default" }: ToastProps) => {
    const message = title || "";
    const descriptionText = description || "";

    if (variant === "destructive") {
      sonnerToast.error(message, {
        description: descriptionText,
      });
    } else {
      sonnerToast(message, {
        description: descriptionText,
      });
    }
  }, []); 

  return { toast };
}

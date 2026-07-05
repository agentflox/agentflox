import { useCallback, ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

interface ToastProps {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive" | "success";
  icon?: ReactNode;
}

export function useToast() {
  const toast = useCallback(({ title, description, variant = "default", icon }: ToastProps) => {
    const message = title || "";
    const descriptionText = description || "";

    if (variant === "destructive") {
      sonnerToast.error(message, {
        description: descriptionText,
        icon,
      });
    } else if (variant === "success") {
      sonnerToast.success(message, {
        description: descriptionText,
        icon,
      });
    } else {
      sonnerToast(message, {
        description: descriptionText,
        icon,
      });
    }
  }, []); 

  return { toast };
}

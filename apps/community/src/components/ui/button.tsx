import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "google" | "destructive" | "ghost" | "secondary";
  icon?: LucideIcon;
  children?: React.ReactNode;
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
};

// Export buttonVariants function for use in other components (like calendar)
export function buttonVariants({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: "primary" | "outline" | "google" | "destructive" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
} = {}) {
  const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-lg leading-none transition duration-300 transform active:scale-98 shadow-md focus:outline-none cursor-pointer';

  let variantClass = '';
  if (variant === 'primary') {
    variantClass = 'bg-indigo-600 hover:bg-indigo-700 text-white focus-visible:ring-2 focus-visible:ring-indigo-300';
  } else if (variant === 'google') {
    variantClass = 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm focus-visible:ring-2 focus-visible:ring-gray-200';
  } else if (variant === 'outline') {
    variantClass = 'bg-transparent border border-cyan-500 text-cyan-600 hover:bg-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-200';
  } else if (variant === 'destructive') {
    variantClass = 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-2 focus-visible:ring-red-300';
  } else if (variant === 'ghost') {
    variantClass = 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 shadow-none focus:ring-0';
  } else if (variant === 'secondary') {
    variantClass = 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm focus-visible:ring-2 focus-visible:ring-secondary/20';
  }

  let sizeClass = '';
  if (size === 'sm') {
    sizeClass = 'h-8 w-fit px-3 text-sm';
  } else if (size === 'lg') {
    sizeClass = 'h-12 w-fit px-6 text-base';
  } else if (size === 'icon') {
    sizeClass = 'h-10 w-10 p-0';
  } else {
    sizeClass = 'h-10 w-fit px-4 py-2';
  }

  return cn(
    baseStyle,
    variantClass,
    sizeClass,
    className
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", icon: Icon, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {asChild ? children : (
          <>
            {Icon && <Icon className="w-5 h-5 mr-2" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export default Button;

import * as React from "react";
import clsx from "clsx";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: "default" | "ghost";
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          variant === "default" && "input",
          variant === "ghost" && "border-0 shadow-none ring-0 px-0",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export function AutoSizeInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const spanRef = React.useRef<HTMLSpanElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useLayoutEffect(() => {
    if (!spanRef.current || !inputRef.current) return;
    inputRef.current.style.width = `${spanRef.current.offsetWidth + 2}px`;
  }, [props.value]);

  return (
    <>
      <input
        ref={inputRef}
        {...props}
        style={{ width: "auto" }}
      />
      <span
        ref={spanRef}
        className="absolute invisible whitespace-pre text-sm font-medium px-1"
      >
        {props.value || " "}
      </span>
    </>
  );
}

export default Input;

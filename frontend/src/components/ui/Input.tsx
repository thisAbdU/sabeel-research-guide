import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  pill?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", pill = false, type = "text", ...props }, ref) => {
    const rounded = pill ? "rounded-full" : "rounded-xl";
    return (
      <input
        type={type}
        ref={ref}
        className={`flex h-10 w-full border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-zinc-100/20 ${rounded} ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

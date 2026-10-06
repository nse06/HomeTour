import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger" | "glass" | "link";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-200 ease-out disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] hover:bg-ink-2",
  secondary: "bg-surface text-ink ring-1 ring-line-strong hover:bg-sunken hover:ring-ink-4",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  accent: "bg-accent text-white shadow-[0_1px_2px_rgb(0_0_0/0.15)] hover:brightness-110",
  danger: "bg-danger text-white hover:brightness-110",
  glass: "bg-white/85 text-ink backdrop-blur-md ring-1 ring-black/5 shadow-soft hover:bg-white",
  link: "text-ink underline-offset-4 hover:underline px-0",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-7 rounded-full px-3 text-xs",
  sm: "h-9 rounded-full px-4 text-sm",
  md: "h-11 rounded-full px-5 text-[15px]",
  lg: "h-13 rounded-full px-7 text-base",
  icon: "h-10 w-10 rounded-full",
  "icon-sm": "h-8 w-8 rounded-full",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], variant === "link" ? "h-auto" : sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
});

"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerOutline" | "success";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 focus-visible:ring-neutral-900/40",
  secondary:
    "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 focus-visible:ring-neutral-400/40",
  ghost:
    "text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-400/40",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600/40",
  dangerOutline:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-600/40",
  success:
    "bg-green-600 text-white shadow-sm hover:bg-green-700 focus-visible:ring-green-600/40",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
};

const baseClasses =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", type = "button", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    );
  }
);
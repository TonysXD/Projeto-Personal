import type { HTMLAttributes } from "react";

type Variant = "success" | "danger" | "warning" | "info" | "violet" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
}

const variantClasses: Record<Variant, string> = {
  success: "bg-green-50 text-green-700",
  danger: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700",
  neutral: "bg-neutral-100 text-neutral-600",
};

const dotClasses: Record<Variant, string> = {
  success: "bg-green-500",
  danger: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
  violet: "bg-violet-500",
  neutral: "bg-neutral-400",
};

export function Badge({
  variant = "neutral",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
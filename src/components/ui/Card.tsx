import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  action?: ReactNode;
}

export function Card({ title, action, className = "", children, ...props }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white p-6 shadow-sm ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
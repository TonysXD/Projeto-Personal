import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-neutral-500">{description}</p>}
      {action}
    </div>
  );
}
"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, className = "", id, children, ...props }, ref) {
    const selectId = id ?? props.name;
    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-neutral-800">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 focus:border-red-600 focus:outline-none ${
            error ? "border-red-500" : ""
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
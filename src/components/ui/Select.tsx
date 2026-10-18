// Form select component styled cleanly with native dropdown behaviour
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, id, options, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-text-main mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={`w-full appearance-none rounded-control border bg-surface pl-3 pr-9 py-2 text-base sm:text-xs text-text-main transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-h-[44px] sm:min-h-[36px] sm:h-9 ${
              error ? 'border-danger focus:ring-danger' : 'border-border'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted">
            <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

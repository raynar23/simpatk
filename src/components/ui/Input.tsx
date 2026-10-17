// Reusable input component matching macOS and iOS touch standards
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-text-main mb-1.5">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`w-full rounded-control border bg-surface px-3 py-2 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-h-[44px] sm:min-h-[36px] sm:h-9 ${
            error ? 'border-danger focus:ring-danger' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

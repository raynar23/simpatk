// Textarea component with macOS styling and touch-friendly mobile layout
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, id, rows = 3, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-text-main mb-1.5">
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          className={`w-full rounded-control border bg-surface px-3 py-2 text-base sm:text-xs text-text-main placeholder:text-text-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
            error ? 'border-danger focus:ring-danger' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

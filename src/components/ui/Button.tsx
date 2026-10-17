// Reusable button component supporting primary, secondary, and danger variants
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className = '', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-control border transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1';

    const variantStyles = {
      primary:
        'bg-primary border-primary text-white hover:bg-primary-dark focus:ring-primary',
      secondary:
        'bg-surface border-border text-text-main hover:bg-bg focus:ring-border',
      danger:
        'bg-danger border-danger text-white hover:bg-danger/90 focus:ring-danger',
    };

    const sizeStyles = {
      sm: 'min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 text-sm sm:text-xs',
      md: 'min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 text-sm sm:text-xs',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

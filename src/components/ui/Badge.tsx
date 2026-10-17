// Compact status badge with solid text and border
import React from 'react';

export type BadgeVariant = 'diproses' | 'selesai' | 'menipis' | 'normal' | 'info';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  const variantStyles = {
    diproses: {
      container: 'bg-[#FFF8E6] text-[#9A5B00] border-[#FFE2A4]',
    },
    selesai: {
      container: 'bg-[#EBF7EE] text-[#1E8E3E] border-[#C8E9D0]',
    },
    menipis: {
      container: 'bg-danger-soft text-danger border-danger/20',
    },
    normal: {
      container: 'bg-bg text-text-muted border-border',
    },
    info: {
      container: 'bg-primary-soft text-primary border-primary/20',
    },
  };

  const current = variantStyles[variant] || variantStyles.normal;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge border select-none ${current.container} ${className}`}
    >
      <span>{children}</span>
    </span>
  );
}

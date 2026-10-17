// Flat text-only status badge with tinted background
import React from 'react';

export type BadgeVariant =
  | 'diproses'
  | 'selesai'
  | 'menipis'
  | 'habis'
  | 'normal'
  | 'info';

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  const variantStyles = {
    diproses: {
      container: 'bg-[#FFF8E6] text-[#9A5B00] border-[#FFE2A4]',
      defaultLabel: 'In Progress',
      isTextOnly: false,
    },
    selesai: {
      container: 'bg-[#EBF7EE] text-[#1E8E3E] border-[#C8E9D0]',
      defaultLabel: 'Completed',
      isTextOnly: false,
    },
    menipis: {
      container: 'bg-danger-soft text-danger border-danger/20',
      defaultLabel: 'Low Stock',
      isTextOnly: false,
    },
    habis: {
      container: 'bg-[#FBE8EA] text-[#9B0010] border-[#F2C2C6]',
      defaultLabel: 'Out of Stock',
      isTextOnly: false,
    },
    normal: {
      container: 'text-text-muted',
      defaultLabel: 'In Stock',
      isTextOnly: true,
    },
    info: {
      container: 'bg-primary-soft text-primary border-primary/20',
      defaultLabel: 'Info',
      isTextOnly: false,
    },
  };

  const current = variantStyles[variant] || variantStyles.normal;
  const label = children !== undefined ? children : current.defaultLabel;

  if (current.isTextOnly) {
    return (
      <span className={`text-xs text-text-muted select-none ${className}`}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge border select-none ${current.container} ${className}`}
    >
      {label}
    </span>
  );
}

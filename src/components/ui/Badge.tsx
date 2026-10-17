// Compact status badge with colored indicator dot
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
      dot: 'bg-warning',
    },
    selesai: {
      container: 'bg-[#EBF7EE] text-[#1E8E3E] border-[#C8E9D0]',
      dot: 'bg-success',
    },
    menipis: {
      container: 'bg-danger-soft text-danger border-danger/20',
      dot: 'bg-danger',
    },
    normal: {
      container: 'bg-bg text-text-muted border-border',
      dot: 'bg-text-muted/60',
    },
    info: {
      container: 'bg-primary-soft text-primary border-primary/20',
      dot: 'bg-primary',
    },
  };

  const current = variantStyles[variant] || variantStyles.normal;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-badge border select-none ${current.container} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />
      <span>{children}</span>
    </span>
  );
}

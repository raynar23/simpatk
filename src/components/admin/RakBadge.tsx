// Reusable badge component for displaying ATK Rack Placement (Rak 1, Rak 2, Rak 3, Rak 4)
'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { RAK_DEFINITIONS, type RakKey } from '@/lib/rakUtils';

interface RakBadgeProps {
  rak: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function RakBadge({ rak, showIcon = true, size = 'sm', className = '' }: RakBadgeProps) {
  const def = RAK_DEFINITIONS.find((d) => d.id === rak) || RAK_DEFINITIONS[0];

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5'
      : 'text-xs px-2.5 py-1';

  return (
    <span
      title={`${def.nama} (${def.zona})`}
      className={`inline-flex items-center gap-1.5 font-medium rounded-control border whitespace-nowrap shrink-0 ${def.theme.badgeBg} ${sizeClasses} ${className}`}
    >
      {showIcon && <Layers className="w-3 h-3 shrink-0 opacity-75" />}
      <span className="font-semibold tracking-tight whitespace-nowrap">{rak}</span>
    </span>
  );
}

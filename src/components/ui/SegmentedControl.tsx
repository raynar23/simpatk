// Segmented control tabs for filtering requests with full-width mobile support
'use client';

import React from 'react';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 bg-border/50 rounded-control border border-border/80 w-full sm:w-auto ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1 text-xs font-medium rounded-[6px] transition-all cursor-pointer min-h-[36px] sm:min-h-[28px] ${
              isActive
                ? 'bg-surface text-text-main shadow-subtle font-semibold'
                : 'text-text-muted hover:text-text-main hover:bg-surface/50'
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  isActive ? 'bg-primary-soft text-primary font-bold' : 'bg-bg text-text-muted'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

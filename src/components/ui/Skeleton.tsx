// Subtle skeleton placeholder loader for table rows, cards, and text lines
import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-control bg-border/60 ${className}`}
      aria-hidden="true"
    />
  );
}

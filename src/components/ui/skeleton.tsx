import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 로딩 자리표시자.
 * `prefers-reduced-motion` 에서는 globals.css 가 애니메이션을 멈춘다.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-muted', className)}
      {...props}
    />
  );
}

/** 목록 화면의 표준 로딩 형태. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <span className="sr-only">불러오는 중입니다.</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-card border border-border bg-surface p-5">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 툴팁.
 *
 * ⚠️ 툴팁에만 있는 정보를 만들지 않는다. 터치 기기와 스크린리더에서 놓치기 쉽다.
 *    보조 설명에만 쓰고, 필수 정보는 본문이나 `Field` 의 hint 로 적는다.
 */

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-64 rounded-md bg-fg px-2.5 py-1.5 text-xs text-white shadow-md',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

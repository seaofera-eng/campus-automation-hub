import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 버튼.
 *
 * 파괴적 동작에는 반드시 `variant="danger"` 를 쓰되, 색만으로 구분하지 않도록
 * 아이콘과 명확한 동사 라벨을 함께 넣는다 (요구사항 12번).
 *
 * 기본 높이 42px, 라벨 15px. 행정 화면에서 손가락과 눈이 편한 크기다
 * (디자인 문서 §8). 한 화면에 primary 를 여러 개 두지 않는다 — 파랑이 흔해지면
 * 어디를 눌러야 할지 알 수 없게 된다.
 */

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'font-semibold transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
        secondary: 'border border-border-strong bg-surface text-fg hover:bg-surface-muted',
        ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
        danger: 'bg-danger text-white hover:brightness-95',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3.5 text-xs [&_svg]:size-4',
        md: 'h-[42px] px-[18px] text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        // 아이콘만 있는 버튼도 최소 40px 을 확보한다 (문서 §13)
        icon: 'size-[42px] [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 다른 요소(Link 등)에 버튼 스타일만 입힐 때 */
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button';
  return (
    <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };

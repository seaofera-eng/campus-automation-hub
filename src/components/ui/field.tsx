import { Label } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 입력 요소와 라벨·도움말·오류 메시지.
 *
 * 오류는 색만으로 알리지 않는다. 아이콘 없이도 읽히도록 텍스트로 명시하고,
 * `aria-invalid` / `aria-describedby` 로 스크린리더에도 전달한다 (요구사항 12번).
 */

const controlClasses = [
  'w-full rounded-md border border-border-strong bg-surface px-3.5 text-fg',
  'placeholder:text-fg-subtle',
  'transition-colors focus-visible:border-primary',
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle',
  'aria-[invalid=true]:border-danger',
].join(' ');

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, 'h-[42px] text-sm', className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, 'min-h-28 py-2.5 text-sm', className)} {...props} />;
}

/** 네이티브 select. 옵션이 단순한 곳에서는 radix Select 대신 이쪽을 쓴다. */
export function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, 'h-[42px] pr-8 text-sm', className)} {...props} />;
}

export function FieldLabel({
  className,
  required,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Label.Root> & { required?: boolean }) {
  return (
    <Label.Root className={cn('text-sm font-medium text-fg', className)} {...props}>
      {children}
      {required ? (
        <span className="ml-1 text-danger" aria-label="필수 입력">
          *
        </span>
      ) : null}
    </Label.Root>
  );
}

export interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  /** 무엇을 입력해야 하는지에 대한 설명 */
  hint?: string;
  /** 무엇이 잘못됐는지 + 어떻게 고치는지 */
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={htmlFor} required={required}>
        {label}
      </FieldLabel>
      {hint ? (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Field 안의 입력 요소에 붙일 접근성 속성을 만든다. */
export function fieldAria(id: string, hint?: string, error?: string) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  } as const;
}

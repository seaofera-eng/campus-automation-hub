'use client';

import { useId, useState } from 'react';
import { Field, Input, fieldAria } from '@/components/ui/field';
import { cn } from '@/lib/utils/cn';

/**
 * 희망 완료 시기 고르기 (리뷰 6.4절).
 *
 * 날짜 입력만 두면 "언제쯤이면 될까"를 스스로 계산해야 한다. 대부분은
 * "이번 달 안" 정도의 감각으로 적으므로 주 단위 버튼을 먼저 준다.
 * 정확한 날짜가 필요한 사람은 '직접 지정'으로 넘어간다.
 *
 * 값은 늘 `YYYY-MM-DD` 문자열이다. 버튼을 눌러도 저장되는 형태는 같다.
 */
const PRESETS = [1, 2, 3, 4] as const;

function afterWeeks(weeks: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

export function DeadlinePicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  const inputId = useId();
  // 값이 이미 있는데 어떤 버튼과도 맞지 않으면 직접 지정으로 연다.
  const [custom, setCustom] = useState(
    () => value !== '' && !PRESETS.some((weeks) => afterWeeks(weeks) === value),
  );

  return (
    <Field label="희망 완료 시기" htmlFor={inputId} error={error}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((weeks) => {
            const target = afterWeeks(weeks);
            const selected = !custom && value === target;
            return (
              <button
                key={weeks}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setCustom(false);
                  onChange(target);
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  selected
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border text-fg-muted hover:bg-surface-muted hover:text-fg',
                )}
              >
                {weeks}주 뒤
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={custom}
            onClick={() => setCustom(true)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              custom
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border text-fg-muted hover:bg-surface-muted hover:text-fg',
            )}
          >
            직접 지정
          </button>
        </div>

        {custom ? (
          <Input
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            {...fieldAria(inputId, undefined, error)}
          />
        ) : (
          <p className="text-xs text-fg-muted">
            {value ? `${value} 까지` : '급하지 않으면 비워 두셔도 됩니다.'}
          </p>
        )}
      </div>
    </Field>
  );
}

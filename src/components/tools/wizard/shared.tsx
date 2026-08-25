'use client';

import { Controller } from 'react-hook-form';
import type { Control, FieldPath, UseFormReturn } from 'react-hook-form';
import type { Profile } from '@/domain/identity/types';
import type { ToolCategory } from '@/domain/tool/types';
import { Input } from '@/components/ui/field';
import type { ToolFormInput } from '@/lib/validation/tool';

/** 위저드 각 단계가 공통으로 받는 것들. */
export interface WizardReferenceData {
  actor: Profile;
  categories: readonly ToolCategory[];
  /** 함께 개발한 사람으로 지정할 수 있는 목록 */
  people: readonly { id: string; name: string }[];
}

export interface StepProps {
  form: UseFormReturn<ToolFormInput>;
  data: WizardReferenceData;
}

/** 단계 안의 소제목 + 설명 */
export function StepSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-fg-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * 숫자 입력.
 *
 * 빈 칸은 `null` 로 둔다. 0 과 "모름"은 다른 값이라 0 으로 채우지 않는다.
 */
export function NumberField({
  control,
  name,
  id,
  suffix,
  placeholder,
}: {
  control: Control<ToolFormInput>;
  name: FieldPath<ToolFormInput>;
  id: string;
  /** 단위 표시 (원, 분, 시간 …) */
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="number"
            min={0}
            inputMode="numeric"
            placeholder={placeholder ?? '모르면 비워 두세요'}
            value={field.value === null || field.value === undefined ? '' : String(field.value)}
            onChange={(event) => {
              const raw = event.target.value;
              field.onChange(raw === '' ? null : Number(raw));
            }}
            onBlur={field.onBlur}
          />
          {suffix ? <span className="shrink-0 text-sm text-fg-muted">{suffix}</span> : null}
        </div>
      )}
    />
  );
}

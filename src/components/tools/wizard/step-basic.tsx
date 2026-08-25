'use client';

import { Controller } from 'react-hook-form';
import { StringListInput } from '@/components/common/string-list-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Input, NativeSelect, Textarea, fieldAria } from '@/components/ui/field';
import { MEMBER_TYPES, MEMBER_TYPE_LABELS } from '@/domain/authz/accounts';
import { RUNTIME_KINDS, RUNTIME_KIND_LABELS } from '@/domain/tool/types';
import { StepSection, type StepProps } from './shared';

export function StepBasic({ form, data }: StepProps) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  return (
    <div className="flex flex-col gap-6">
      <StepSection title="도구 식별 정보">
        <Field
          label="도구 이름"
          htmlFor="name"
          required
          hint="같은 이름의 도구가 이미 있으면 등록되지 않습니다. 무엇을 하는 도구인지 드러나게 지어 주세요."
          error={errors.name?.message}
        >
          <Input
            {...register('name')}
            {...fieldAria('name', 'hint', errors.name?.message)}
            maxLength={120}
            placeholder="예: 학사 규정 검색 챗봇"
          />
        </Field>

        <Field
          label="한 줄 소개"
          htmlFor="summary"
          required
          hint="목록에서 이 문장으로 도구를 구분합니다."
          error={errors.summary?.message}
        >
          <Input
            {...register('summary')}
            {...fieldAria('summary', 'hint', errors.summary?.message)}
            maxLength={300}
            placeholder="예: 학사 규정 문서를 검색해 근거 조항과 함께 답변합니다."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="카테고리" htmlFor="categoryId" required error={errors.categoryId?.message}>
            <NativeSelect
              {...register('categoryId')}
              {...fieldAria('categoryId', undefined, errors.categoryId?.message)}
            >
              <option value="">선택해 주세요</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="어디서 실행하나요"
            htmlFor="runtimeKind"
            required
            hint="설치가 필요한지 아닌지가 쓸지 말지를 가릅니다."
            error={errors.runtimeKind?.message}
          >
            <NativeSelect {...register('runtimeKind')} {...fieldAria('runtimeKind', 'hint')}>
              {RUNTIME_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {RUNTIME_KIND_LABELS[kind]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Controller
          control={control}
          name="recommendedFor"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-fg">누구에게 맞는 도구인가요</legend>
              <p className="text-xs text-fg-muted">
                아무것도 고르지 않으면 &quot;누구나&quot;로 표시됩니다.
              </p>
              <div className="flex flex-wrap gap-3">
                {MEMBER_TYPES.map((member) => (
                  <label key={member} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={field.value.includes(member)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked === true
                            ? [...field.value, member]
                            : field.value.filter((value: string) => value !== member),
                        )
                      }
                    />
                    {MEMBER_TYPE_LABELS[member]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        />

        <Field
          label="태그"
          htmlFor="tags-input"
          hint="검색에 쓰입니다. 예: 챗봇, 규정, 학사"
          error={errors.tags?.message}
        >
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <StringListInput
                id="tags-input"
                values={field.value}
                onChange={field.onChange}
                placeholder="태그를 입력하고 Enter"
                maxLength={30}
              />
            )}
          />
        </Field>
      </StepSection>

      <StepSection
        title="무엇을 위한 도구인가"
        description="검토자가 필요성을 판단하는 근거가 됩니다."
      >
        <Field
          label="해결하려는 업무 문제"
          htmlFor="problemStatement"
          required
          hint="지금 어떤 점이 불편하거나 오래 걸리는지 구체적으로 적어 주세요."
          error={errors.problemStatement?.message}
        >
          <Textarea
            {...register('problemStatement')}
            {...fieldAria('problemStatement', 'hint', errors.problemStatement?.message)}
            rows={4}
            placeholder="예: 학사 규정 문의가 하루 20건씩 들어오는데, 담당자가 매번 규정집을 찾아 답변하느라 건당 10분씩 걸립니다."
          />
        </Field>
      </StepSection>
    </div>
  );
}

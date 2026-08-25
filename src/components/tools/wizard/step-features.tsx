'use client';

import { Controller } from 'react-hook-form';
import { StringListInput } from '@/components/common/string-list-input';
import { Field, Input, Textarea, fieldAria } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AUTOMATION_LEVELS,
  AUTOMATION_LEVEL_DESCRIPTIONS,
  AUTOMATION_LEVEL_LABELS,
} from '@/domain/tool/types';
import { NumberField, StepSection, type StepProps } from './shared';

export function StepFeatures({ form }: StepProps) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  return (
    <div className="flex flex-col gap-6">
      <StepSection title="주요 기능">
        <Field
          label="기능 목록"
          htmlFor="keyFeatures-input"
          required
          hint="한 줄에 기능 하나씩 적어 주세요."
          error={errors.keyFeatures?.message}
        >
          <Controller
            control={control}
            name="keyFeatures"
            render={({ field }) => (
              <StringListInput
                id="keyFeatures-input"
                values={field.value}
                onChange={field.onChange}
                placeholder="예: 규정 조항 검색 후 근거와 함께 답변"
              />
            )}
          />
        </Field>
      </StepSection>

      <StepSection
        title="업무 흐름"
        description="지금과 도구 사용 후를 비교해 적어 주세요. 도입 효과를 판단하는 근거가 됩니다."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="현재 업무 흐름"
            htmlFor="currentWorkflow"
            required
            error={errors.currentWorkflow?.message}
          >
            <Textarea
              {...register('currentWorkflow')}
              {...fieldAria('currentWorkflow', undefined, errors.currentWorkflow?.message)}
              rows={5}
              placeholder="예: 문의 접수 → 담당자가 규정집 검색 → 관련 조항 확인 → 답변 작성"
            />
          </Field>

          <Field
            label="자동화 후 업무 흐름"
            htmlFor="automatedWorkflow"
            required
            error={errors.automatedWorkflow?.message}
          >
            <Textarea
              {...register('automatedWorkflow')}
              {...fieldAria('automatedWorkflow', undefined, errors.automatedWorkflow?.message)}
              rows={5}
              placeholder="예: 문의 접수 → 챗봇이 조항과 함께 초안 제시 → 담당자가 확인 후 발송"
            />
          </Field>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="입력 자료"
            htmlFor="inputData"
            required
            hint="이 도구에 무엇을 넣습니까?"
            error={errors.inputData?.message}
          >
            <Textarea
              {...register('inputData')}
              {...fieldAria('inputData', 'hint', errors.inputData?.message)}
              rows={3}
            />
          </Field>

          <Field
            label="결과물"
            htmlFor="outputData"
            required
            hint="무엇이 나옵니까?"
            error={errors.outputData?.message}
          >
            <Textarea
              {...register('outputData')}
              {...fieldAria('outputData', 'hint', errors.outputData?.message)}
              rows={3}
            />
          </Field>
        </div>
      </StepSection>

      <StepSection title="사용 규모">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="예상 사용자"
            htmlFor="expectedUsers"
            hint="누가 쓰게 됩니까?"
            error={errors.expectedUsers?.message}
          >
            <Input
              {...register('expectedUsers')}
              {...fieldAria('expectedUsers', 'hint')}
              placeholder="예: 학사관리과 직원 8명"
            />
          </Field>

          <Field
            label="월 예상 사용 횟수"
            htmlFor="monthlyExpectedUsage"
            error={errors.monthlyExpectedUsage?.message}
          >
            <NumberField
              control={control}
              name="monthlyExpectedUsage"
              id="monthlyExpectedUsage"
              suffix="회"
            />
          </Field>
        </div>
      </StepSection>

      <StepSection
        title="자동화 수준"
        description="사람이 어디까지 관여하는지에 따라 위험 평가 기준이 달라집니다."
      >
        <Controller
          control={control}
          name="automationLevel"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="flex flex-col gap-2"
            >
              {AUTOMATION_LEVELS.map((level) => (
                <label
                  key={level}
                  htmlFor={`automationLevel-${level}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-surface-muted"
                >
                  <RadioGroupItem value={level} id={`automationLevel-${level}`} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium text-fg">
                      {AUTOMATION_LEVEL_LABELS[level]}
                    </span>
                    <span className="block text-xs text-fg-muted">
                      {AUTOMATION_LEVEL_DESCRIPTIONS[level]}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}
        />
      </StepSection>
    </div>
  );
}

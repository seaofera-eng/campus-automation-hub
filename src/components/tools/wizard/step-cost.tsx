'use client';

import { Field, Input, Textarea, fieldAria } from '@/components/ui/field';
import { NumberField, StepSection, type StepProps } from './shared';

export function StepCost({ form }: StepProps) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  return (
    <div className="flex flex-col gap-6">
      <StepSection
        title="비용"
        description="모르는 항목은 비워 두세요. 0원과 '파악하지 못함'은 다르게 기록됩니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="초기 개발 비용" htmlFor="initialDevelopmentCost">
            <NumberField
              control={control}
              name="initialDevelopmentCost"
              id="initialDevelopmentCost"
              suffix="원"
            />
          </Field>

          <Field label="월 운영 비용" htmlFor="monthlyOperationCost">
            <NumberField
              control={control}
              name="monthlyOperationCost"
              id="monthlyOperationCost"
              suffix="원"
            />
          </Field>

          <Field label="월 LLM API 비용" htmlFor="monthlyLlmCost">
            <NumberField control={control} name="monthlyLlmCost" id="monthlyLlmCost" suffix="원" />
          </Field>

          <Field label="외부 서비스 구독료" htmlFor="externalServiceCost">
            <NumberField
              control={control}
              name="externalServiceCost"
              id="externalServiceCost"
              suffix="원"
            />
          </Field>

          <Field label="사용자 1인당 비용" htmlFor="costPerUser">
            <NumberField control={control} name="costPerUser" id="costPerUser" suffix="원" />
          </Field>
        </div>

        <Field
          label="비용 산정 근거"
          htmlFor="costBasis"
          hint="어떻게 계산한 금액인지 적어 두면 나중에 검증할 수 있습니다."
          error={errors.costBasis?.message}
        >
          <Textarea {...register('costBasis')} {...fieldAria('costBasis', 'hint')} rows={2} />
        </Field>
      </StepSection>

      <StepSection title="기대 성과" description="도입 전후를 숫자로 비교할 수 있으면 좋습니다.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="현재 처리 시간" htmlFor="currentProcessingMinutes">
            <NumberField
              control={control}
              name="currentProcessingMinutes"
              id="currentProcessingMinutes"
              suffix="분"
            />
          </Field>

          <Field label="자동화 후 처리 시간" htmlFor="automatedProcessingMinutes">
            <NumberField
              control={control}
              name="automatedProcessingMinutes"
              id="automatedProcessingMinutes"
              suffix="분"
            />
          </Field>

          <Field label="월 절감 시간" htmlFor="monthlySavedHours">
            <NumberField
              control={control}
              name="monthlySavedHours"
              id="monthlySavedHours"
              suffix="시간"
            />
          </Field>
        </div>

        <Field
          label="오류 감소 효과"
          htmlFor="errorReductionNote"
          error={errors.errorReductionNote?.message}
        >
          <Input {...register('errorReductionNote')} {...fieldAria('errorReductionNote')} />
        </Field>

        <Field
          label="기대 효과"
          htmlFor="expectedBenefit"
          hint="숫자로 표현하기 어려운 효과도 좋습니다."
          error={errors.expectedBenefit?.message}
        >
          <Textarea
            {...register('expectedBenefit')}
            {...fieldAria('expectedBenefit', 'hint')}
            rows={3}
          />
        </Field>

        <Field
          label="성과 측정 방법"
          htmlFor="measurementMethod"
          hint="나중에 실제 효과를 확인할 방법을 미리 정해 두세요."
          error={errors.measurementMethod?.message}
        >
          <Input {...register('measurementMethod')} {...fieldAria('measurementMethod', 'hint')} />
        </Field>
      </StepSection>

      <StepSection title="링크">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="소스 코드 저장소"
            htmlFor="repositoryUrl"
            error={errors.repositoryUrl?.message}
          >
            <Input
              {...register('repositoryUrl')}
              {...fieldAria('repositoryUrl', undefined, errors.repositoryUrl?.message)}
              placeholder="https://"
            />
          </Field>

          <Field label="서비스 주소" htmlFor="serviceUrl" error={errors.serviceUrl?.message}>
            <Input
              {...register('serviceUrl')}
              {...fieldAria('serviceUrl', undefined, errors.serviceUrl?.message)}
              placeholder="https://"
            />
          </Field>
        </div>
      </StepSection>
    </div>
  );
}

'use client';

import { Lock } from 'lucide-react';
import { Controller, useWatch } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Input, Textarea, fieldAria } from '@/components/ui/field';
import { DATA_CLASSIFICATION_LABELS, isSensitiveClassification } from '@/domain/tool/types';
import { cn } from '@/lib/utils/cn';
import { StepSection, type StepProps } from './shared';

export function StepSecurity({ form, data }: StepProps) {
  const { register, control, setValue, formState } = form;
  const errors = formState.errors;

  const classifications = useWatch({ control, name: 'classifications' });
  const integrations = useWatch({ control, name: 'integrations' });
  const sendsDataExternally = useWatch({ control, name: 'sendsDataExternally' });

  const selectedSystemIds = new Set(integrations.map((item) => item.integrationSystemId));
  const usesSensitiveData = classifications.some(
    (entry) => entry.inUse && isSensitiveClassification(entry.classification),
  );

  function toggleIntegration(systemId: string, checked: boolean) {
    if (checked) {
      setValue('integrations', [...integrations, { integrationSystemId: systemId, note: '' }], {
        shouldDirty: true,
      });
    } else {
      setValue(
        'integrations',
        integrations.filter((item) => item.integrationSystemId !== systemId),
        { shouldDirty: true },
      );
    }
  }

  function setClassification(index: number, inUse: boolean) {
    const next = classifications.map((entry, position) =>
      position === index ? { ...entry, inUse } : entry,
    );
    setValue('classifications', next, { shouldDirty: true });
  }

  return (
    <div className="flex flex-col gap-6">
      <StepSection
        title="연동 시스템"
        description="이 도구가 데이터를 주고받는 시스템을 모두 선택해 주세요."
      >
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">연동 시스템 선택</legend>
          {data.integrationSystems.map((system) => {
            const checked = selectedSystemIds.has(system.id);
            return (
              <label
                key={system.id}
                htmlFor={`integration-${system.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-surface-muted"
              >
                <Checkbox
                  id={`integration-${system.id}`}
                  checked={checked}
                  onCheckedChange={(value) => toggleIntegration(system.id, value === true)}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{system.name}</span>
                  <span className="block text-xs text-fg-muted">
                    {system.isExternal ? '외부 서비스' : '교내 시스템'}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <Field
          label="그 밖의 연동"
          htmlFor="otherIntegrationNote"
          hint="목록에 없는 시스템이 있으면 적어 주세요."
          error={errors.otherIntegrationNote?.message}
        >
          <Input
            {...register('otherIntegrationNote')}
            {...fieldAria('otherIntegrationNote', 'hint')}
          />
        </Field>
      </StepSection>

      <StepSection
        title="다루는 데이터 종류"
        description="이 항목이 위험 평가의 핵심 입력입니다. 실제로 처리하는 것을 빠짐없이 선택해 주세요."
      >
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">데이터 분류 선택</legend>
          {classifications.map((entry, index) => {
            const sensitive = isSensitiveClassification(entry.classification);
            return (
              <label
                key={entry.classification}
                htmlFor={`classification-${entry.classification}`}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors',
                  entry.inUse && sensitive
                    ? 'border-danger/40 bg-danger-soft'
                    : 'border-border hover:bg-surface-muted',
                )}
              >
                <Checkbox
                  id={`classification-${entry.classification}`}
                  checked={entry.inUse}
                  onCheckedChange={(value) => setClassification(index, value === true)}
                />
                <span className="flex items-center gap-1.5 font-medium text-fg">
                  {sensitive ? (
                    <Lock className="size-3.5 text-danger" aria-hidden="true" />
                  ) : null}
                  {DATA_CLASSIFICATION_LABELS[entry.classification]}
                  {sensitive ? <span className="sr-only">(민감정보)</span> : null}
                </span>
              </label>
            );
          })}
        </fieldset>

        {errors.classifications?.message ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {errors.classifications.message}
          </p>
        ) : null}

        {usesSensitiveData ? (
          <Alert tone="warning" title="민감정보를 다루는 도구입니다">
            개인정보·성적·상담·연구·재정 정보를 처리하는 도구는 검토 단계에서 위험 체크리스트를
            반드시 작성하게 됩니다. 아래 저장 위치와 보관기간을 정확히 적어 주세요.
          </Alert>
        ) : null}
      </StepSection>

      <StepSection title="데이터 처리 방식">
        <Controller
          control={control}
          name="sendsDataExternally"
          render={({ field }) => (
            <label
              htmlFor="sendsDataExternally"
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-surface-muted"
            >
              <Checkbox
                id="sendsDataExternally"
                checked={field.value}
                onCheckedChange={(value) => field.onChange(value === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-fg">
                  외부 서비스로 데이터를 전송합니다
                </span>
                <span className="block text-xs text-fg-muted">
                  외부 LLM API, 외부 저장소, 외부 메일 발송 등이 해당합니다.
                </span>
              </span>
            </label>
          )}
        />

        {sendsDataExternally ? (
          <Field
            label="전송 대상"
            htmlFor="externalTransferTargets"
            required
            hint="어떤 서비스로 무엇을 보내는지 적어 주세요."
            error={errors.externalTransferTargets?.message}
          >
            <Textarea
              {...register('externalTransferTargets')}
              {...fieldAria(
                'externalTransferTargets',
                'hint',
                errors.externalTransferTargets?.message,
              )}
              rows={2}
              placeholder="예: OpenAI API 로 질문 문장만 전송. 학번·이름은 제거 후 전송."
            />
          </Field>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="데이터 저장 위치"
            htmlFor="dataStorageLocation"
            required
            error={errors.dataStorageLocation?.message}
          >
            <Input
              {...register('dataStorageLocation')}
              {...fieldAria('dataStorageLocation', undefined, errors.dataStorageLocation?.message)}
              placeholder="예: 교내 서버 / 국내 클라우드"
            />
          </Field>

          <Field
            label="보관 기간"
            htmlFor="dataRetentionPeriod"
            required
            hint="정하지 않은 것 자체가 위험 요소로 평가됩니다."
            error={errors.dataRetentionPeriod?.message}
          >
            <Input
              {...register('dataRetentionPeriod')}
              {...fieldAria('dataRetentionPeriod', 'hint', errors.dataRetentionPeriod?.message)}
              placeholder="예: 처리 후 즉시 삭제 / 6개월"
            />
          </Field>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Controller
            control={control}
            name="hasExecutionLog"
            render={({ field }) => (
              <label
                htmlFor="hasExecutionLog"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-surface-muted"
              >
                <Checkbox
                  id="hasExecutionLog"
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
                <span className="font-medium text-fg">실행 기록(로그)을 남깁니다</span>
              </label>
            )}
          />

          <Controller
            control={control}
            name="requiresHumanApproval"
            render={({ field }) => (
              <label
                htmlFor="requiresHumanApproval"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-surface-muted"
              >
                <Checkbox
                  id="requiresHumanApproval"
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
                <span className="font-medium text-fg">결과를 사람이 최종 확인합니다</span>
              </label>
            )}
          />
        </div>
      </StepSection>
    </div>
  );
}

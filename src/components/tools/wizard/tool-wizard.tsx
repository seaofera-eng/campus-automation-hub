'use client';

import { Check, ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import type { FieldPath } from 'react-hook-form';
import { saveToolDraftAction, submitToolAction } from '@/actions/tool-actions';
import type { AttachmentView } from '@/application/tools/attachments';
import { UnsavedChangesGuard } from '@/components/common/unsaved-changes-guard';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ToolStatus } from '@/domain/tool/types';
import { toolSubmitSchema, type ToolFormInput } from '@/lib/validation/tool';
import { cn } from '@/lib/utils/cn';
import { StepBasic } from './step-basic';
import { StepCost } from './step-cost';
import { StepFeatures } from './step-features';
import { StepReview } from './step-review';
import { StepSecurity } from './step-security';
import type { WizardReferenceData } from './shared';

/**
 * 도구 등록 위저드 (요구사항 6번·11번).
 *
 * 설계상 중요한 점 세 가지.
 *
 * 1. **검증 규칙은 서버와 같은 Zod 스키마를 쓴다.** 단계별 검사는 그 스키마의
 *    결과에서 현재 단계 필드만 골라 쓴다. 규칙을 두 벌 관리하지 않기 위함이다.
 * 2. **단계 이동은 검증을 통과해야 하지만, 임시저장은 언제든 된다.**
 *    작성 중에 저장을 막으면 작업이 날아간다.
 * 3. 최종 신청 여부는 **서버가 다시 판단한다.** 여기 검사는 사용자 편의일 뿐이다.
 */

const STEPS = [
  { title: '기본 정보', description: '이름 · 분류 · 해결하려는 문제' },
  { title: '기능과 업무 흐름', description: '무엇을 어떻게 처리하는지' },
  { title: '연동과 데이터', description: '연동 시스템 · 데이터 · 보안' },
  { title: '비용과 성과', description: '비용 · 기대 효과 · 링크' },
  { title: '첨부와 확인', description: '자료 첨부 후 최종 확인' },
] as const;

/** 각 단계가 책임지는 필드. 단계 이동 시 이 필드들만 검사한다. */
const STEP_FIELDS: readonly (readonly FieldPath<ToolFormInput>[])[] = [
  [
    'name',
    'summary',
    'categoryId',
    'departmentId',
    'operationsManagerUserId',
    'visibility',
    'tags',
    'description',
    'problemStatement',
  ],
  [
    'keyFeatures',
    'currentWorkflow',
    'automatedWorkflow',
    'inputData',
    'outputData',
    'expectedUsers',
    'monthlyExpectedUsage',
    'automationLevel',
  ],
  [
    'integrations',
    'otherIntegrationNote',
    'classifications',
    'sendsDataExternally',
    'externalTransferTargets',
    'dataStorageLocation',
    'dataRetentionPeriod',
    'hasExecutionLog',
    'requiresHumanApproval',
  ],
  [
    'initialDevelopmentCost',
    'monthlyOperationCost',
    'monthlyLlmCost',
    'externalServiceCost',
    'costPerUser',
    'costBasis',
    'currentProcessingMinutes',
    'automatedProcessingMinutes',
    'monthlySavedHours',
    'errorReductionNote',
    'expectedBenefit',
    'measurementMethod',
    'repositoryUrl',
    'serviceUrl',
  ],
  ['versionLabel', 'changeNote'],
];

export interface ToolWizardProps {
  data: WizardReferenceData;
  initialForm: ToolFormInput;
  tool: { id: string; status: ToolStatus } | null;
  attachments: readonly AttachmentView[];
}

export function ToolWizard({ data, initialForm, tool, attachments }: ToolWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [toolId, setToolId] = useState<string | null>(tool?.id ?? null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ToolFormInput>({ defaultValues: initialForm, mode: 'onBlur' });
  const { handleSubmit, setError, clearErrors, formState, getValues } = form;

  const isResubmission = tool?.status === 'REVISION_REQUIRED';

  /** 전체 스키마로 검사한 뒤 주어진 필드에 해당하는 오류만 폼에 붙인다. */
  function validateFields(fields: readonly FieldPath<ToolFormInput>[]): boolean {
    clearErrors();
    const result = toolSubmitSchema.safeParse(getValues());
    if (result.success) return true;

    const targeted = result.error.issues.filter((issue) =>
      fields.includes(issue.path[0] as FieldPath<ToolFormInput>),
    );
    for (const issue of targeted) {
      setError(issue.path[0] as FieldPath<ToolFormInput>, {
        type: 'manual',
        message: issue.message,
      });
    }
    return targeted.length === 0;
  }

  function goToStep(target: number) {
    setMessage(null);
    // 뒤로 갈 때는 막지 않는다. 앞으로 갈 때만 현재 단계를 검사한다.
    if (target > step) {
      for (let index = step; index < target; index += 1) {
        const fields = STEP_FIELDS[index];
        if (fields && !validateFields(fields)) {
          setStep(index);
          return;
        }
      }
    }
    setStep(target);
  }

  function persistDraft(options: { thenNavigate?: boolean } = {}) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveToolDraftAction({
        toolId: toolId ?? undefined,
        form: getValues(),
      });

      if (!result.ok) {
        applyServerErrors(result.error.fields);
        setMessage({ tone: 'danger', text: result.error.message });
        return;
      }

      setToolId(result.data.toolId);
      form.reset(getValues(), { keepValues: true });
      setMessage({ tone: 'success', text: '임시저장했습니다. 나중에 이어서 작성할 수 있습니다.' });

      if (options.thenNavigate) {
        router.push(`/tools/${result.data.toolId}`);
      } else {
        router.refresh();
      }
    });
  }

  function applyServerErrors(fields: Record<string, string> | undefined) {
    if (!fields) return;
    for (const [path, text] of Object.entries(fields)) {
      // 서버 오류 경로는 'form.name' 처럼 앞에 접두어가 붙는다.
      const fieldName = path.replace(/^form\./, '') as FieldPath<ToolFormInput>;
      setError(fieldName, { type: 'server', message: text });
    }
  }

  function submit() {
    setMessage(null);

    if (!toolId) {
      setMessage({
        tone: 'danger',
        text: '먼저 임시저장을 해 주세요. 저장된 뒤에 등록을 신청할 수 있습니다.',
      });
      return;
    }

    // 모든 단계를 한 번에 검사하고, 문제가 있는 첫 단계로 데려간다.
    for (let index = 0; index < STEP_FIELDS.length; index += 1) {
      const fields = STEP_FIELDS[index];
      if (fields && !validateFields(fields)) {
        setStep(index);
        setMessage({
          tone: 'danger',
          text: `${STEPS[index]?.title} 단계에 빠진 내용이 있습니다. 표시된 항목을 채운 뒤 다시 신청해 주세요.`,
        });
        return;
      }
    }

    startTransition(async () => {
      const result = await submitToolAction({ toolId, form: getValues() });
      if (!result.ok) {
        applyServerErrors(result.error.fields);
        setMessage({ tone: 'danger', text: result.error.message });
        return;
      }
      form.reset(getValues(), { keepValues: true });
      router.push(`/tools/${result.data.toolId}`);
    });
  }

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <form onSubmit={handleSubmit(() => submit())} className="flex flex-col gap-4">
      <UnsavedChangesGuard enabled={formState.isDirty && !pending} />

      <ol className="flex flex-wrap gap-2" aria-label="등록 단계">
        {STEPS.map((item, index) => {
          const state = index === step ? 'current' : index < step ? 'done' : 'todo';
          return (
            <li key={item.title}>
              <button
                type="button"
                onClick={() => goToStep(index)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  state === 'current' && 'border-primary bg-primary text-primary-fg',
                  state === 'done' && 'border-primary/30 bg-primary-soft text-primary',
                  state === 'todo' && 'border-border bg-surface text-fg-muted hover:bg-surface-muted',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]',
                    state === 'current' ? 'bg-primary-fg/20' : 'bg-surface-muted',
                  )}
                >
                  {state === 'done' ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                </span>
                {item.title}
              </button>
            </li>
          );
        })}
      </ol>

      {message ? (
        <Alert tone={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
      ) : null}

      {isResubmission ? (
        <Alert tone="warning" title="보완 요청을 받은 도구입니다">
          검토 의견을 반영해 수정한 뒤 다시 신청해 주세요. 마지막 단계의 &quot;변경 사항&quot;에
          무엇을 고쳤는지 적어 두면 검토가 빨라집니다.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {step + 1}. {current?.title}
          </CardTitle>
          <p className="text-sm text-fg-muted">{current?.description}</p>
        </CardHeader>

        <CardContent>
          {step === 0 ? <StepBasic form={form} data={data} /> : null}
          {step === 1 ? <StepFeatures form={form} data={data} /> : null}
          {step === 2 ? <StepSecurity form={form} data={data} /> : null}
          {step === 3 ? <StepCost form={form} data={data} /> : null}
          {step === 4 ? (
            <StepReview form={form} data={data} toolId={toolId} attachments={attachments} />
          ) : null}
        </CardContent>

        <CardFooter className="flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={step === 0 || pending}
              onClick={() => goToStep(step - 1)}
            >
              <ChevronLeft aria-hidden="true" />
              이전
            </Button>
            {!isLastStep ? (
              <Button type="button" disabled={pending} onClick={() => goToStep(step + 1)}>
                다음
                <ChevronRight aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => persistDraft()}
            >
              <Save aria-hidden="true" />
              {pending ? '저장 중…' : '임시저장'}
            </Button>

            {isLastStep ? (
              <Button type="submit" disabled={pending}>
                <Send aria-hidden="true" />
                {isResubmission ? '보완 후 재신청' : '등록 신청'}
              </Button>
            ) : null}
          </div>
        </CardFooter>
      </Card>

      <p className="text-xs text-fg-muted">
        등록을 신청하면 검토자가 배정되어 내용과 위험 요소를 확인합니다. 신청 후에는 검토가 끝날
        때까지 내용을 수정할 수 없습니다.
      </p>
    </form>
  );
}

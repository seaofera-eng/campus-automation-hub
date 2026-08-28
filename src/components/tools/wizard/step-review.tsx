'use client';

import { useWatch } from 'react-hook-form';
import type { AttachmentView } from '@/application/tools/attachments';
import { DataClassificationChip } from '@/components/common/status-badge';
import { MEMBER_TYPE_LABELS } from '@/domain/authz/accounts';
import type { MemberType } from '@/domain/authz/accounts';
import { SubmitAnalysisNotice } from '@/components/analysis/submit-analysis-notice';
import { Field, Input, Textarea, fieldAria } from '@/components/ui/field';
import {
  AUTOMATION_LEVEL_LABELS,
  RUNTIME_KIND_LABELS,
} from '@/domain/tool/types';
import { AttachmentUploader } from './attachment-uploader';
import { StepSection, type StepProps } from './shared';

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-2.5 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-sm text-fg">{value || <span className="text-fg-subtle">미입력</span>}</dd>
    </div>
  );
}

export function StepReview({
  form,
  data,
  toolId,
  attachments,
}: StepProps & { toolId: string | null; attachments: readonly AttachmentView[] }) {
  const { register, control, formState } = form;
  const values = useWatch({ control });

  const categoryName =
    data.categories.find((category) => category.id === values.categoryId)?.name ?? '';
  const usedClassifications = (values.classifications ?? []).filter((entry) => entry?.inUse);

  return (
    <div className="flex flex-col gap-6">
      <StepSection title="첨부 자료" description="사용 설명서, 테스트 결과, 보안 검토 자료 등">
        <AttachmentUploader toolId={toolId} initialAttachments={attachments} />
      </StepSection>

      <StepSection title="버전 정보">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="버전 표기"
            htmlFor="versionLabel"
            hint="비워 두면 v1.0 으로 저장됩니다."
            error={formState.errors.versionLabel?.message}
          >
            <Input
              {...register('versionLabel')}
              {...fieldAria('versionLabel', 'hint')}
              placeholder="v1.0"
            />
          </Field>

          <Field
            label="변경 사항"
            htmlFor="changeNote"
            hint="이번 버전에서 무엇이 달라졌는지"
            error={formState.errors.changeNote?.message}
          >
            <Textarea {...register('changeNote')} {...fieldAria('changeNote', 'hint')} rows={2} />
          </Field>
        </div>
      </StepSection>

      <StepSection title="입력 내용 확인" description="신청 전에 아래 내용을 확인해 주세요.">
        <dl className="rounded-card border border-border bg-surface px-4 py-1">
          <SummaryRow label="도구 이름" value={values.name} />
          <SummaryRow label="한 줄 소개" value={values.summary} />
          <SummaryRow label="카테고리" value={categoryName} />
          <SummaryRow
            label="어디서 실행"
            value={values.runtimeKind ? RUNTIME_KIND_LABELS[values.runtimeKind] : ''}
          />
          <SummaryRow
            label="추천 대상"
            value={
              (values.recommendedFor ?? []).length > 0
                ? (values.recommendedFor ?? [])
                    .map((member: MemberType) => MEMBER_TYPE_LABELS[member])
                    .join(', ')
                : '누구나'
            }
          />
          <SummaryRow
            label="자동화 수준"
            value={values.automationLevel ? AUTOMATION_LEVEL_LABELS[values.automationLevel] : ''}
          />
          <SummaryRow
            label="주요 기능"
            value={
              (values.keyFeatures ?? []).length > 0 ? (
                <ul className="list-inside list-disc">
                  {(values.keyFeatures ?? []).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : (
                ''
              )
            }
          />
          <SummaryRow
            label="다루는 데이터"
            value={
              usedClassifications.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {usedClassifications.map((entry) =>
                    entry?.classification ? (
                      <DataClassificationChip
                        key={entry.classification}
                        value={entry.classification}
                      />
                    ) : null,
                  )}
                </span>
              ) : (
                ''
              )
            }
          />
          <SummaryRow
            label="외부 전송"
            value={values.sendsDataExternally ? values.externalTransferTargets || '있음' : '없음'}
          />
          <SummaryRow
            label="사람 최종 확인"
            value={values.requiresHumanApproval ? '있음' : '없음'}
          />
        </dl>
      </StepSection>

      <SubmitAnalysisNotice />
    </div>
  );
}

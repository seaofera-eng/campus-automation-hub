import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { emptyChecklistItems, loadReviewDetail } from '@/application/reviews/query';
import { PhaseNotice } from '@/components/common/phase-notice';
import {
  DataClassificationChip,
  RiskLevelBadge,
  ToolStatusBadge,
} from '@/components/common/status-badge';
import { ReviewActionsPanel } from '@/components/reviews/review-actions-panel';
import { RiskChecklistForm } from '@/components/reviews/risk-checklist-form';
import { FieldList, FieldRow } from '@/components/tools/detail-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { REVIEW_COMMENT_KIND_LABELS } from '@/domain/review/types';
import { AUTOMATION_LEVEL_LABELS, isSensitiveClassification } from '@/domain/tool/types';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '도구 검토' };

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await guardPage(() => loadReviewDetail(id));
  const { tool, version, checklist } = detail;

  const usedClassifications = version.security.classifications.filter((entry) => entry.inUse);
  const sensitiveCount = usedClassifications.filter((entry) =>
    isSensitiveClassification(entry.classification),
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-fg">{tool.name}</h1>
            <ToolStatusBadge status={tool.status} />
            {checklist ? <RiskLevelBadge level={checklist.riskLevel} /> : null}
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {detail.departmentName} · {detail.categoryName} · 담당 {detail.ownerName}
            {detail.assigneeName ? ` · 검토 ${detail.assigneeName}` : ' · 검토자 미배정'}
          </p>
        </div>

        <Button variant="secondary" asChild>
          <Link href={`/tools/${tool.id}`}>
            <ExternalLink aria-hidden="true" />
            전체 상세 보기
          </Link>
        </Button>
      </div>

      {sensitiveCount > 0 ? (
        <Alert tone="warning" title={`민감정보 ${sensitiveCount}종을 다루는 도구입니다`}>
          아래 데이터 처리 방식을 확인하고, 위험 체크리스트에 해당 항목을 빠짐없이 표시해 주세요.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>검토에 필요한 정보</CardTitle>
              <p className="text-sm text-fg-muted">
                판단에 필요한 항목만 모았습니다. 전체 내용은 도구 상세에서 볼 수 있습니다.
              </p>
            </CardHeader>
            <CardContent>
              <FieldList>
                <FieldRow label="한 줄 소개" value={tool.summary} />
                <FieldRow label="해결하려는 문제" value={version.problemStatement} multiline />
                <FieldRow
                  label="주요 기능"
                  value={
                    version.keyFeatures.length > 0 ? (
                      <ul className="list-inside list-disc">
                        {version.keyFeatures.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    ) : (
                      ''
                    )
                  }
                />
                <FieldRow
                  label="자동화 수준"
                  value={AUTOMATION_LEVEL_LABELS[version.automationLevel]}
                />
                <FieldRow
                  label="다루는 데이터"
                  value={
                    usedClassifications.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5">
                        {usedClassifications.map((entry) => (
                          <DataClassificationChip
                            key={entry.classification}
                            value={entry.classification}
                          />
                        ))}
                      </span>
                    ) : (
                      ''
                    )
                  }
                />
                <FieldRow
                  label="외부 전송"
                  value={
                    version.security.sendsDataExternally
                      ? version.security.externalTransferTargets || '있음 (대상 미기재)'
                      : '없음'
                  }
                  multiline
                />
                <FieldRow label="저장 위치" value={version.security.dataStorageLocation} />
                <FieldRow label="보관 기간" value={version.security.dataRetentionPeriod} />
                <FieldRow
                  label="실행 기록"
                  value={version.security.hasExecutionLog ? '남김' : '남기지 않음'}
                />
                <FieldRow
                  label="사람 최종 확인"
                  value={version.security.requiresHumanApproval ? '있음' : '없음'}
                />
              </FieldList>
            </CardContent>
          </Card>

          <RiskChecklistForm
            toolId={tool.id}
            initialItems={checklist?.items ?? emptyChecklistItems()}
            initialRiskLevel={checklist?.riskLevel ?? null}
            initialRationale={checklist?.rationale ?? ''}
            reviewedBy={detail.assigneeName}
            reviewedAt={checklist?.reviewedAt ?? null}
          />

          {detail.comments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>검토 의견 ({detail.comments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {detail.comments.map((comment) => (
                    <li key={comment.id} className="rounded-card border border-border p-3">
                      <p className="text-xs text-fg-subtle">
                        {REVIEW_COMMENT_KIND_LABELS[comment.kind]} · {comment.authorName} ·{' '}
                        {formatDateTime(comment.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <ReviewActionsPanel
            toolId={tool.id}
            transitions={detail.transitions}
            canAssignSelf={detail.canAssignSelf}
            hasChecklist={checklist !== null}
          />

          <PhaseNotice
            phase="PHASE_2"
            feature="AI 중복 탐지와 위험 자동 평가"
            fallback="지금은 위 체크리스트를 직접 작성해 판단합니다."
          />
        </div>
      </div>
    </div>
  );
}

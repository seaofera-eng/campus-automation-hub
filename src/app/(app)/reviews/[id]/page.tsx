import { ExternalLink, History } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { emptyChecklistItems, loadReviewDetail } from '@/application/reviews/query';
import { DuplicateAnalysisCard } from '@/components/analysis/duplicate-analysis-card';
import { QualityReviewCard } from '@/components/analysis/quality-review-card';
import { RiskAnalysisCard } from '@/components/analysis/risk-analysis-card';
import { AnalysisPendingNotice } from '@/components/analysis/analysis-pending-notice';
import {
  DataClassificationChip,
  RiskLevelBadge,
  ToolStatusBadge,
} from '@/components/common/status-badge';
import { ReviewActionsPanel } from '@/components/reviews/review-actions-panel';
import { RiskChecklistForm } from '@/components/reviews/risk-checklist-form';
import { DetailAccordion } from '@/components/tools/detail-accordion';
import { FieldList, FieldRow } from '@/components/tools/detail-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { REVIEW_COMMENT_KIND_LABELS } from '@/domain/review/types';
import {
  AUTOMATION_LEVEL_LABELS,
  TOOL_STATUS_LABELS,
  isSensitiveClassification,
} from '@/domain/tool/types';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '도구 검토' };

/**
 * 검토 화면 (리뷰 2026-08-28 5절 반영).
 *
 * ## 무엇이 문제였나
 *
 * "너무 많은 정보가 한 페이지에 모여 있음."
 * "위험 체크리스트도 하단에 배치하니까 보기가 불편하고 대충 넘어가고 싶어짐."
 *
 * 카드 여섯 장이 같은 무게로 세로로 쌓여 있었다. 전부 펼쳐져 있으니 스크롤이
 * 길고, 정작 검토자가 **반드시 채워야 하는 위험 체크리스트가 맨 아래**에
 * 있었다. 아래로 갈수록 집중력이 떨어지는 곳에 제일 중요한 일을 둔 셈이다.
 *
 * ## 어떻게 바꿨나
 *
 * 화면을 세 층으로 나눴다.
 *
 * 1. **판단에 바로 쓰는 것** — 민감정보·중복·품질을 배경색 박스로 위에
 * 2. **해야 하는 일** — 위험 체크리스트. 접지 않는다. 이 화면에 온 이유다
 * 3. **참고** — 등록 내용·지난 이력·의견은 접어 둔다. 필요할 때 연다
 *
 * 접는 데 `<details>` 를 쓰므로 Ctrl+F 로 접힌 내용까지 찾을 수 있다.
 * 정보를 없앤 것이 아니라 **순서를 매긴 것**이다.
 */
export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await guardPage(() => loadReviewDetail(id));
  const { tool, version, checklist } = detail;

  const usedClassifications = version.security.classifications.filter((entry) => entry.inUse);
  const sensitiveCount = usedClassifications.filter((entry) =>
    isSensitiveClassification(entry.classification),
  ).length;

  // 재신청된 도구인가. 검토자가 제일 먼저 알아야 할 사실이다.
  const wasRevised = detail.statusHistory.some((entry) => entry.toStatus === 'REVISION_REQUIRED');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-fg">{tool.name}</h1>
            <ToolStatusBadge status={tool.status} />
            {checklist ? <RiskLevelBadge level={checklist.riskLevel} /> : null}
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {detail.ownerName} 등록
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

      {/* 보완 요청을 받았다가 다시 올라온 도구. 지난 지적을 먼저 보게 한다. */}
      {wasRevised ? (
        <Alert tone="info" title="보완 요청을 받았다가 다시 올라온 도구입니다">
          아래 &quot;지난 검토 이력&quot;에서 무엇을 지적했는지 확인한 뒤 판단해 주세요.
        </Alert>
      ) : null}

      {sensitiveCount > 0 ? (
        <Alert tone="warning" title={`민감정보 ${sensitiveCount}종을 다루는 도구입니다`}>
          아래 데이터 처리 방식을 확인하고, 위험 체크리스트에 해당 항목을 빠짐없이 표시해
          주세요.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* ------------------------------------------------------------ */}
          {/* 1층 — 판단에 바로 쓰는 것                                     */}
          {/* ------------------------------------------------------------ */}
          <section className="rounded-card border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-fg">이 도구가 다루는 것</h2>
            <dl className="mt-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <dt className="w-24 shrink-0 text-xs text-fg-subtle">한 줄 소개</dt>
                <dd className="min-w-0 flex-1 text-sm text-fg">{tool.summary || '—'}</dd>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <dt className="w-24 shrink-0 text-xs text-fg-subtle">다루는 데이터</dt>
                <dd className="min-w-0 flex-1">
                  {usedClassifications.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {usedClassifications.map((entry) => (
                        <DataClassificationChip
                          key={entry.classification}
                          value={entry.classification}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="text-sm text-fg-subtle">표시하지 않음</span>
                  )}
                </dd>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <dt className="w-24 shrink-0 text-xs text-fg-subtle">외부 전송</dt>
                <dd className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-fg">
                  {version.security.sendsDataExternally
                    ? version.security.externalTransferTargets || '있음 (대상 미기재)'
                    : '없음'}
                </dd>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <dt className="w-24 shrink-0 text-xs text-fg-subtle">사람 확인</dt>
                <dd className="min-w-0 flex-1 text-sm text-fg">
                  {version.security.requiresHumanApproval ? '있음' : '없음'}
                  <span className="text-fg-subtle">
                    {' · '}실행 기록 {version.security.hasExecutionLog ? '남김' : '남기지 않음'}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {detail.duplicateAnalysis ? (
            <DuplicateAnalysisCard analysis={detail.duplicateAnalysis} />
          ) : (
            <AnalysisPendingNotice feature="중복 자동화 탐지" />
          )}

          {detail.qualityReview ? (
            <QualityReviewCard review={detail.qualityReview} />
          ) : (
            <AnalysisPendingNotice feature="멀티 LLM 품질검증" />
          )}

          {detail.riskAnalysis ? (
            <RiskAnalysisCard analysis={detail.riskAnalysis} />
          ) : (
            <AnalysisPendingNotice
              feature="위험도 자동 평가"
              fallback="아래 체크리스트를 직접 채워 주세요."
            />
          )}

          {/* ------------------------------------------------------------ */}
          {/* 2층 — 해야 하는 일. 접지 않는다                                */}
          {/* ------------------------------------------------------------ */}
          <RiskChecklistForm
            toolId={tool.id}
            initialItems={checklist?.items ?? emptyChecklistItems()}
            initialRiskLevel={checklist?.riskLevel ?? null}
            initialRationale={checklist?.rationale ?? ''}
            reviewedBy={detail.assigneeName}
            reviewedAt={checklist?.reviewedAt ?? null}
          />

          {/* ------------------------------------------------------------ */}
          {/* 3층 — 참고. 접어 둔다                                          */}
          {/* ------------------------------------------------------------ */}
          <DetailAccordion title="등록 내용" hint="문제·기능·자동화 수준">
            <FieldList>
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
              <FieldRow label="지금 업무 방식" value={version.currentWorkflow} multiline />
              <FieldRow label="도구를 쓰면" value={version.automatedWorkflow} multiline />
              <FieldRow
                label="자동화 수준"
                value={AUTOMATION_LEVEL_LABELS[version.automationLevel]}
              />
              <FieldRow label="분류" value={detail.categoryName} />
              {/*
                저장 위치·보관 기간은 더 이상 등록자에게 묻지 않는다 (5절 3.2).
                값이 있을 때만 보여준다 — 빈 줄로 자리만 차지하지 않게.
              */}
              {version.security.dataStorageLocation ? (
                <FieldRow label="저장 위치" value={version.security.dataStorageLocation} />
              ) : null}
              {version.security.dataRetentionPeriod ? (
                <FieldRow label="보관 기간" value={version.security.dataRetentionPeriod} />
              ) : null}
            </FieldList>
          </DetailAccordion>

          {/*
            지난 검토 이력 (리뷰 2026-08-28 5절).

            "재신청을 한게 이력에 안남는거 같음."

            남고 있었지만 이 화면에 없어서 도구 상세로 나갔다 와야 했다.
            재신청된 도구를 볼 때 제일 중요한 정보라 여기로 가져왔다.
          */}
          <DetailAccordion
            title="지난 검토 이력"
            hint={`${detail.statusHistory.length}건`}
            defaultOpen={wasRevised}
          >
            <ol className="flex flex-col gap-2.5">
              {detail.statusHistory.map((entry) => (
                <li key={entry.id} className="flex gap-2.5">
                  <History
                    className="mt-0.5 size-3.5 shrink-0 text-fg-subtle"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-fg">
                      {entry.fromStatus ? `${TOOL_STATUS_LABELS[entry.fromStatus]} → ` : ''}
                      <span className="font-semibold">{TOOL_STATUS_LABELS[entry.toStatus]}</span>
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {entry.changedByName} · {formatDateTime(entry.changedAt)}
                    </p>
                    {entry.reason ? (
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-fg-muted">
                        {entry.reason}
                      </p>
                    ) : null}
                    {entry.reviewComment ? (
                      <p className="mt-1 whitespace-pre-wrap rounded-card border border-border bg-surface-muted p-2 text-sm text-fg-muted">
                        {entry.reviewComment}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </DetailAccordion>

          {detail.comments.length > 0 ? (
            <DetailAccordion title="검토 의견" hint={`${detail.comments.length}건`}>
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
            </DetailAccordion>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <ReviewActionsPanel
            toolId={tool.id}
            transitions={detail.transitions}
            canAssignSelf={detail.canAssignSelf}
            hasChecklist={checklist !== null}
          />
        </div>
      </div>
    </div>
  );
}

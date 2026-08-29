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
import { ReviewWizard } from '@/components/reviews/review-wizard';
import { RiskChecklistForm } from '@/components/reviews/risk-checklist-form';
import { DetailAccordion } from '@/components/tools/detail-accordion';
import { FieldList, FieldRow } from '@/components/tools/detail-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DUPLICATE_VERDICT_LABELS, QUALITY_VERDICT_LABELS } from '@/domain/analysis/types';
import { REVIEW_COMMENT_KIND_LABELS } from '@/domain/review/types';
import {
  AUTOMATION_LEVEL_LABELS,
  RISK_LEVEL_LABELS,
  TOOL_STATUS_LABELS,
  isSensitiveClassification,
} from '@/domain/tool/types';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '도구 검토' };

/**
 * 검토 화면 (리뷰 2026-08-28 · 2026-08-29 5절 반영).
 *
 * ## 두 가지 모습으로 나온다
 *
 * "미검토와 검토중인 건들에 대해서 검토 프로세스를 친절하게 마법사 형태로
 *  바꾸고, 단계별로 검토자가 확인하면서 최종 승인하는 방식으로"
 *
 * - **미검토·검토 중** → 마법사. 한 번에 한 단계씩, 확인해야 다음으로 간다.
 * - **그 밖의 상태**(보완 요청됨·시범운영) → 지금까지의 한 장짜리 화면.
 *   할 일이 하나뿐인 상태에 다섯 단계를 씌우면 그건 친절이 아니라 방해다.
 *
 * ## 내용은 한 번만 만든다
 *
 * 아래에서 조각(`overview`·`duplicateNode`…)을 먼저 만들고 두 모습이 나눠 쓴다.
 * 마법사와 한 장짜리 화면이 서로 다른 내용을 보여 주면 "어느 쪽이 맞는지"를
 * 묻게 된다.
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

  // 검토가 진행 중인 건만 마법사로 안내한다.
  const inWizard = tool.status === 'SUBMITTED' || tool.status === 'HUMAN_REVIEW';

  /* ---------------------------------------------------------------------- */
  /* 화면 조각 — 마법사와 한 장짜리 화면이 나눠 쓴다                          */
  /* ---------------------------------------------------------------------- */

  const overview = (
    <section className="rounded-card border border-border bg-surface-muted p-4">
      <h3 className="text-sm font-semibold text-fg">이 도구가 다루는 것</h3>
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
                  <DataClassificationChip key={entry.classification} value={entry.classification} />
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
  );

  const registeredDetails = (
    <DetailAccordion title="등록 내용" hint="문제·기능·자동화 수준" defaultOpen={inWizard}>
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
        <FieldRow label="자동화 수준" value={AUTOMATION_LEVEL_LABELS[version.automationLevel]} />
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
  );

  const duplicateNode = detail.duplicateAnalysis ? (
    <DuplicateAnalysisCard analysis={detail.duplicateAnalysis} />
  ) : (
    <AnalysisPendingNotice feature="중복 자동화 탐지" />
  );

  const qualityNode = detail.qualityReview ? (
    <QualityReviewCard review={detail.qualityReview} />
  ) : (
    <AnalysisPendingNotice feature="멀티 LLM 품질검증" />
  );

  const riskAnalysisNode = detail.riskAnalysis ? (
    <RiskAnalysisCard analysis={detail.riskAnalysis} />
  ) : (
    <AnalysisPendingNotice
      feature="위험도 자동 평가"
      fallback="아래 체크리스트를 직접 채워 주세요."
    />
  );

  const checklistNode = (
    <RiskChecklistForm
      toolId={tool.id}
      initialItems={checklist?.items ?? emptyChecklistItems()}
      initialRiskLevel={checklist?.riskLevel ?? null}
      initialRationale={checklist?.rationale ?? ''}
      reviewedBy={detail.assigneeName}
      reviewedAt={checklist?.reviewedAt ?? null}
    />
  );

  /*
    지난 검토 이력 (리뷰 2026-08-28 5절).

    "재신청을 한게 이력에 안남는거 같음."

    남고 있었지만 이 화면에 없어서 도구 상세로 나갔다 와야 했다.
    재신청된 도구를 볼 때 제일 중요한 정보라 여기로 가져왔다.
  */
  const historyNode = (
    <DetailAccordion
      title="지난 검토 이력"
      hint={`${detail.statusHistory.length}건`}
      defaultOpen={wasRevised}
    >
      <ol className="flex flex-col gap-2.5">
        {detail.statusHistory.map((entry) => (
          <li key={entry.id} className="flex gap-2.5">
            <History className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm text-fg">
                {entry.fromStatus ? `${TOOL_STATUS_LABELS[entry.fromStatus]} → ` : ''}
                <span className="font-semibold">{TOOL_STATUS_LABELS[entry.toStatus]}</span>
              </p>
              <p className="text-xs text-fg-subtle">
                {entry.changedByName} · {formatDateTime(entry.changedAt)}
              </p>
              {entry.reason ? (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-fg-muted">{entry.reason}</p>
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
  );

  const commentsNode =
    detail.comments.length > 0 ? (
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
    ) : null;

  /*
    5단계 요약 — 앞의 네 단계에서 나온 결론만 한 줄씩 다시 모은다.

    분석을 돌리지 않았으면 "아직 확인하지 않음"이라고 쓴다. **0 이나 '없음'으로
    채우지 않는다** — 없는 것과 확인하지 않은 것은 다르다.
  */
  const recap = (
    <section className="rounded-card border border-border bg-surface-muted p-4">
      <h3 className="text-sm font-semibold text-fg">여기까지 확인한 것</h3>
      <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <RecapRow
          label="중복"
          value={
            detail.duplicateAnalysis
              ? detail.duplicateAnalysis.topVerdict
                ? DUPLICATE_VERDICT_LABELS[detail.duplicateAnalysis.topVerdict]
                : '겹치는 도구 없음'
              : null
          }
        />
        <RecapRow
          label="등록 내용"
          value={
            detail.qualityReview
              ? `${QUALITY_VERDICT_LABELS[detail.qualityReview.verdict]} · 확인 필요 ${detail.qualityReview.blockerCount}건`
              : null
          }
        />
        <RecapRow label="민감정보" value={sensitiveCount > 0 ? `${sensitiveCount}종` : '없음'} />
        <RecapRow
          label="위험 등급"
          value={checklist ? RISK_LEVEL_LABELS[checklist.riskLevel] : null}
          missingText="체크리스트 미작성"
        />
      </dl>
    </section>
  );

  /* ---------------------------------------------------------------------- */

  const header = (
    <>
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
          데이터 처리 방식을 확인하고, 위험 체크리스트에 해당 항목을 빠짐없이 표시해 주세요.
        </Alert>
      ) : null}
    </>
  );

  /* ---------------------------------------------------------------------- */
  /* 1) 마법사 — 미검토·검토 중                                               */
  /* ---------------------------------------------------------------------- */

  if (inWizard) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {header}

        <ReviewWizard
          toolId={tool.id}
          status={tool.status}
          ownerName={detail.ownerName}
          assigneeName={detail.assigneeName}
          canAssignSelf={detail.canAssignSelf}
          hasChecklist={checklist !== null}
          transitions={detail.transitions}
          overview={
            <div className="flex flex-col gap-4">
              {overview}
              {registeredDetails}
            </div>
          }
          duplicate={duplicateNode}
          quality={qualityNode}
          risk={
            <div className="flex flex-col gap-4">
              {riskAnalysisNode}
              {checklistNode}
            </div>
          }
          recap={recap}
        />

        {/* 참고 자료는 마법사 밖에 접어 둔다. 단계를 방해하지 않고 언제든 열린다. */}
        <div className="flex flex-col gap-3">
          {historyNode}
          {commentsNode}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* 2) 한 장짜리 화면 — 보완 요청됨·시범운영                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="flex flex-col gap-4">
      {header}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {overview}
          {duplicateNode}
          {qualityNode}
          {riskAnalysisNode}
          {checklistNode}
          {registeredDetails}
          {historyNode}
          {commentsNode}
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

/** 요약 한 줄. 값이 없으면 왜 없는지 쓴다 — 0 으로 채우지 않는다. */
function RecapRow({
  label,
  value,
  missingText = '아직 확인하지 않음',
}: {
  label: string;
  value: string | null;
  missingText?: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-20 shrink-0 text-xs text-fg-subtle">{label}</dt>
      <dd className={value ? 'text-sm font-medium text-fg' : 'text-sm text-fg-subtle'}>
        {value ?? missingText}
      </dd>
    </div>
  );
}

import { MEMBER_TYPE_LABELS } from '@/domain/authz/accounts';
import { ChevronLeft, Paperclip, Pencil, Play, Send, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { after } from 'next/server';
import { loadToolDetail } from '@/application/tools/query';
import { recordToolView } from '@/application/tools/usage';
import { AnalysisPendingNotice } from '@/components/analysis/analysis-pending-notice';
import { DuplicateAnalysisCard } from '@/components/analysis/duplicate-analysis-card';
import { RiskAnalysisCard } from '@/components/analysis/risk-analysis-card';
import {
  DataClassificationChip,
  ImprovementStatusBadge,
  RiskLevelBadge,
  ToolStatusBadge,
} from '@/components/common/status-badge';
import { EvaluationForm } from '@/components/evaluations/evaluation-form';
import { ImprovementForm } from '@/components/improvements/improvement-form';
import { DetailAccordion } from '@/components/tools/detail-accordion';
import { FieldList, FieldRow } from '@/components/tools/detail-field';
import { NewVersionButton } from '@/components/tools/new-version-button';
import { ToolAccessPanel } from '@/components/tools/tool-access-panel';
import { StatusTransitionDialog } from '@/components/tools/status-transition-dialog';
import { ToolDetailTabs, type DetailTab } from '@/components/tools/tool-detail-tabs';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SCORE_LABELS } from '@/domain/evaluation/types';
import { REVIEW_COMMENT_KIND_LABELS } from '@/domain/review/types';
import {
  AUTOMATION_LEVEL_LABELS,
  TOOL_STATUS_DESCRIPTIONS,
  TOOL_STATUS_LABELS,
  RUNTIME_KIND_LABELS,
} from '@/domain/tool/types';
import { guardPage } from '@/lib/auth/page-guard';
import { humanFileSize } from '@/lib/validation/attachment';
import { formatDateTime } from '@/lib/utils/datetime';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const detail = await loadToolDetail(id);
    return { title: detail.tool.name };
  } catch {
    return { title: '도구' };
  }
}

export default async function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await guardPage(() => loadToolDetail(id));
  const { tool, version, permissions } = detail;

  // 조회 기록은 응답을 보낸 뒤에 남긴다. 화면 표시를 늦추지 않기 위함이다.
  after(() => recordToolView(detail.actor, tool.id));

  const usedClassifications = version.security.classifications.filter((entry) => entry.inUse);

  // 프로그램 파일은 "쓰기" 영역에서 크게, 나머지 자료는 아래 목록에서 작게 보여준다.
  const programFiles = detail.attachments.filter((entry) => entry.kind === 'PROGRAM');
  const referenceFiles = detail.attachments.filter((entry) => entry.kind !== 'PROGRAM');

  const tabs: DetailTab[] = [
    {
      value: 'overview',
      label: '개요',
      content: (
        /* 리뷰 4.2절: 탭을 늘어놓는 대신 한 화면에 접어 둔다.
           기본 정보만 펼쳐 두고 나머지는 필요할 때 연다. */
        <div className="flex flex-col gap-2">
          <DetailAccordion title="기본 정보" defaultOpen>
            <FieldList>
              <FieldRow label="한 줄 소개" value={tool.summary} />
              <FieldRow label="해결하려는 문제" value={version.problemStatement} multiline />
              <FieldRow label="카테고리" value={detail.categoryName} />
              <FieldRow label="실행 방식" value={RUNTIME_KIND_LABELS[tool.runtimeKind]} />
              <FieldRow
                label="추천 대상"
                value={
                  tool.recommendedFor.length > 0
                    ? tool.recommendedFor.map((member) => MEMBER_TYPE_LABELS[member]).join(', ')
                    : '누구나'
                }
              />
              <FieldRow
                label="개발자"
                value={detail.developerNames.length > 0 ? detail.developerNames.join(', ') : ''}
              />
              <FieldRow label="태그" value={tool.tags.length > 0 ? tool.tags.join(', ') : ''} />
              <FieldRow
                label="조회 / 실행"
                value={`${detail.usage.views.toLocaleString('ko-KR')}회 / ${detail.usage.launches.toLocaleString('ko-KR')}회`}
              />
            </FieldList>
          </DetailAccordion>

          <DetailAccordion title="기능">
            <FieldList>
              <FieldRow
                label="주요 기능"
                value={
                  version.keyFeatures.length > 0 ? (
                    <ul className="list-inside list-disc space-y-0.5">
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
              <FieldRow label="입력 자료" value={version.inputData} multiline />
              <FieldRow label="결과물" value={version.outputData} multiline />
              <FieldRow label="예상 사용자" value={version.expectedUsers} />
            </FieldList>
          </DetailAccordion>

          <DetailAccordion title="업무 흐름">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-card border border-border p-4">
                <h3 className="text-sm font-semibold text-fg">현재 업무 흐름</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">
                  {version.currentWorkflow || '미입력'}
                </p>
              </section>
              <section className="rounded-card border border-primary/30 bg-primary-soft/30 p-4">
                <h3 className="text-sm font-semibold text-fg">자동화 후 업무 흐름</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">
                  {version.automatedWorkflow || '미입력'}
                </p>
              </section>
            </div>
          </DetailAccordion>

          <DetailAccordion title="버전" hint={`${detail.versions.length}개`}>
            <FieldList>
              {detail.versions.map((item) => (
                <FieldRow
                  key={item.id}
                  label={item.versionLabel || '(버전 표기 없음)'}
                  hint={formatDateTime(item.createdAt)}
                  value={
                    <>
                      {item.id === tool.currentVersionId ? (
                        <span className="mr-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                          현재 버전
                        </span>
                      ) : null}
                      {item.changeNote || '변경 사항이 기록되지 않았습니다.'}
                    </>
                  }
                />
              ))}
            </FieldList>
          </DetailAccordion>
        </div>
      ),
    },
    {
      value: 'security',
      label: '데이터·보안',
      content: (
        <div className="flex flex-col gap-4">
          {usedClassifications.some((entry) =>
            ['PERSONAL', 'GRADE', 'COUNSELING', 'RESEARCH', 'FINANCIAL'].includes(
              entry.classification,
            ),
          ) ? (
            <Alert tone="warning" title="민감정보를 다루는 도구입니다">
              사용 전에 아래 저장 위치와 보관 기간, 사람 확인 절차를 확인해 주세요.
            </Alert>
          ) : null}

          <FieldList>
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
            <FieldRow
              label="위험도 평가"
              value={
                detail.riskChecklist ? (
                  <span className="flex flex-col gap-1.5">
                    <RiskLevelBadge level={detail.riskChecklist.riskLevel} />
                    <span className="text-xs text-fg-muted">
                      {detail.riskChecklist.rationale || '사유가 기록되지 않았습니다.'}
                    </span>
                  </span>
                ) : (
                  <span className="text-fg-subtle">아직 검토자가 작성하지 않았습니다.</span>
                )
              }
            />
          </FieldList>

          {detail.riskAnalysis ? (
            <RiskAnalysisCard analysis={detail.riskAnalysis} />
          ) : (
            <AnalysisPendingNotice
              feature="위험도 자동 평가"
              fallback="검토자가 체크리스트를 직접 작성해 등급을 정합니다."
            />
          )}

          {detail.duplicateAnalysis && detail.duplicateAnalysis.findings.length > 0 ? (
            <DuplicateAnalysisCard analysis={detail.duplicateAnalysis} />
          ) : null}
        </div>
      ),
    },
    {
      value: 'evaluations',
      label: '평가',
      count: detail.evaluationSummary.count,
      content:
        detail.evaluationSummary.count === 0 ? (
          <EmptyState
            title="아직 등록된 평가가 없습니다"
            description={
              permissions.canEvaluate
                ? '이 도구를 써 보셨다면 평가를 남겨 주세요.'
                : '시범운영 또는 정식 승인 상태의 도구에만 평가를 등록할 수 있습니다.'
            }
            action={
              permissions.canEvaluate ? (
                <EvaluationForm toolId={tool.id} existing={detail.myEvaluation} />
              ) : null
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* 점수 하나만 받으므로 표 대신 숫자를 크게 보여준다 (리뷰 4.2절:
                "구성이 눈에 잘 안보임. 세로로 한줄로 하고 글자 크기를 키워야 함") */}
            <div className="flex flex-wrap items-baseline gap-3 rounded-card border border-border p-5">
              <p className="text-3xl font-bold tabular-nums text-fg">
                {detail.evaluationSummary.averageOverall?.toFixed(1) ?? '-'}
                <span className="ml-1 text-base font-normal text-fg-muted">/ 5</span>
              </p>
              <p className="text-sm text-fg-muted">
                {detail.evaluationSummary.count}명이 남긴 종합 만족도입니다.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {detail.evaluations.map((evaluation) => (
                <li key={evaluation.id} className="rounded-card border border-border p-4">
                  {/* 평가는 익명이다. 누가 썼는지 보여주지 않는다 (리뷰 7절). */}
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="text-lg font-semibold tabular-nums text-fg">
                      {evaluation.scores.overall}
                      <span className="ml-0.5 text-sm font-normal text-fg-muted">/ 5</span>
                    </p>
                    <p className="text-sm text-fg-muted">
                      {SCORE_LABELS[evaluation.scores.overall]}
                    </p>
                    <p className="ml-auto text-xs text-fg-subtle">
                      {formatDateTime(evaluation.createdAt)}
                      {evaluation.revisionCount > 0
                        ? ` · ${evaluation.revisionCount}회 수정됨`
                        : ''}
                    </p>
                  </div>
                  {evaluation.comment ? (
                    <p className="mt-2 whitespace-pre-wrap text-base text-fg">
                      {evaluation.comment}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ),
    },
    {
      value: 'improvements',
      label: '개선 요청',
      count: detail.improvements.length,
      content:
        detail.improvements.length === 0 ? (
          <EmptyState
            title="등록된 개선 요청이 없습니다"
            description="사용 중 불편한 점이 있으면 개선을 요청할 수 있습니다."
            action={
              permissions.canRequestImprovement ? (
                <ImprovementForm toolId={tool.id} toolName={tool.name} />
              ) : null
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {detail.improvements.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border p-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/improvements/${request.id}`}
                      className="text-sm font-medium text-fg hover:underline"
                    >
                      {request.title}
                    </Link>
                    <p className="text-xs text-fg-subtle">
                      {request.requesterName} · {formatDateTime(request.createdAt)}
                    </p>
                  </div>
                  <ImprovementStatusBadge status={request.status} />
                </li>
              ))}
            </ul>
          </>
        ),
    },
    {
      value: 'history',
      label: '활동 이력',
      count: detail.statusHistory.length,
      content: (
        <div className="flex flex-col gap-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-fg">상태 변경 이력</h3>
            <ol className="flex flex-col gap-3">
              {detail.statusHistory.map((entry) => (
                <li key={entry.id} className="border-l-2 border-border pl-3">
                  <p className="text-sm text-fg">
                    {entry.fromStatus ? TOOL_STATUS_LABELS[entry.fromStatus] : '신규'} →{' '}
                    <strong className="font-semibold">{TOOL_STATUS_LABELS[entry.toStatus]}</strong>
                  </p>
                  <p className="mt-0.5 text-sm text-fg-muted">{entry.reason}</p>
                  {entry.reviewComment ? (
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-surface-muted p-2 text-sm text-fg-muted">
                      {entry.reviewComment}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {entry.changedByName} · {formatDateTime(entry.changedAt)}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {detail.reviewComments.length > 0 ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-fg">검토 의견</h3>
              <ul className="flex flex-col gap-2">
                {detail.reviewComments.map((comment) => (
                  <li key={comment.id} className="rounded-card border border-border p-3">
                    <p className="text-xs text-fg-subtle">
                      {REVIEW_COMMENT_KIND_LABELS[comment.kind]} · {comment.authorName} ·{' '}
                      {formatDateTime(comment.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{comment.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {/* 상세로 바로 들어온 경우(주소 공유·알림)에는 브라우저 뒤로가기가
            목록으로 데려다주지 않는다. 돌아갈 곳을 화면에 둔다. */}
        <Link
          href="/tools"
          className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          자동화 도구 목록
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-subtle">{detail.categoryName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-fg">{tool.name}</h1>
              <ToolStatusBadge status={tool.status} />
            </div>
            <p className="mt-1 text-sm text-fg-muted">{TOOL_STATUS_DESCRIPTIONS[tool.status]}</p>

            {/*
              핵심 사실 한 줄. 탭을 열어 보지 않아도 "얼마나 쓰이고 얼마나
              위험한가"가 보여야 한다 (디자인 문서 §9).
              없는 값은 0 으로 채우지 않고 그렇게 적는다.
            */}
            <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted">
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">평점</dt>
                <Star className="size-3.5 shrink-0" aria-hidden="true" />
                <dd>
                  {detail.evaluationSummary.averageOverall === null
                    ? '평가 없음'
                    : `${detail.evaluationSummary.averageOverall.toFixed(1)} (${detail.evaluationSummary.count}건)`}
                </dd>
              </div>

              <div className="flex items-center gap-1.5">
                <dt className="sr-only">실행 횟수</dt>
                <Play className="size-3.5 shrink-0" aria-hidden="true" />
                <dd>
                  {detail.usage.launches > 0
                    ? `${detail.usage.launches.toLocaleString('ko-KR')}회 실행`
                    : '실행 기록 없음'}
                </dd>
              </div>

              <div className="flex items-center gap-1.5">
                <dt className="sr-only">위험도</dt>
                <dd>
                  {detail.riskChecklist ? (
                    <RiskLevelBadge level={detail.riskChecklist.riskLevel} />
                  ) : (
                    <span className="text-fg-subtle">위험도 미판정</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {/* 평가와 개선 요청은 탭 안에 두지 않는다. 탭을 열어야만 보이면
                "이 도구 어땠나요"를 물을 기회를 놓친다. */}
            {permissions.canEvaluate ? (
              <EvaluationForm toolId={tool.id} existing={detail.myEvaluation} />
            ) : null}
            {permissions.canRequestImprovement ? (
              <ImprovementForm toolId={tool.id} toolName={tool.name} />
            ) : null}

            {permissions.canEdit ? (
              <Button variant="secondary" asChild>
                <Link href={`/tools/${tool.id}/edit`}>
                  <Pencil aria-hidden="true" />
                  수정
                </Link>
              </Button>
            ) : null}
            {permissions.canSubmit ? (
              <Button asChild>
                <Link href={`/tools/${tool.id}/edit`}>
                  <Send aria-hidden="true" />
                  등록 신청
                </Link>
              </Button>
            ) : null}
            {/* 검토를 통과한 도구는 새 버전을 만들어 고친다 (리뷰 3절) */}
            {permissions.canStartNewVersion ? (
              <NewVersionButton
                toolId={tool.id}
                toolName={tool.name}
                statusLabel={TOOL_STATUS_LABELS[tool.status]}
              />
            ) : null}

            {/* 실행 가능한 상태 전환만 나온다. 목록은 서버의 상태머신이 계산한다.
                등록 신청(DRAFT→SUBMITTED)은 위저드에서 하므로 여기서는 제외한다. */}
            {detail.transitions
              .filter((rule) => rule.to !== 'SUBMITTED')
              .map((rule) => (
                <StatusTransitionDialog
                  key={`${rule.from}-${rule.to}`}
                  toolId={tool.id}
                  toStatus={rule.to}
                  label={rule.label}
                  destructive={rule.destructive}
                />
              ))}
          </div>
        </div>

        {/*
          이 도구를 실제로 쓰는 곳 (리뷰 2026-08-27 3절).
          "다운 받거나 실행할 수 있는 버튼이 없음."
        */}
        <ToolAccessPanel
          toolId={tool.id}
          access={detail.access}
          serviceUrl={version.serviceUrl}
          repositoryUrl={version.repositoryUrl}
          programFiles={programFiles}
          isOwner={detail.actor.id === tool.ownerUserId}
        />

        {/* 프로그램 파일은 위 영역에서 이미 크게 보여줬다. 여기는 참고 자료만. */}
        {referenceFiles.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {referenceFiles.map((attachment) => (
              <li key={attachment.id}>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-fg-muted transition-colors hover:bg-surface-muted"
                >
                  <Paperclip className="size-3.5" aria-hidden="true" />
                  {attachment.fileName}
                  <span className="text-fg-subtle">{humanFileSize(attachment.byteSize)}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ToolDetailTabs tabs={tabs} />
    </div>
  );
}

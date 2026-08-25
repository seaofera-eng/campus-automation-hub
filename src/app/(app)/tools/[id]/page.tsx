import { ChevronLeft, Paperclip, Pencil, Send } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { after } from 'next/server';
import { loadToolDetail } from '@/application/tools/query';
import { recordToolView } from '@/application/tools/usage';
import { PhaseNotice } from '@/components/common/phase-notice';
import {
  DataClassificationChip,
  ImprovementStatusBadge,
  RiskLevelBadge,
  ToolStatusBadge,
} from '@/components/common/status-badge';
import { EvaluationForm } from '@/components/evaluations/evaluation-form';
import { ImprovementForm } from '@/components/improvements/improvement-form';
import { FieldList, FieldRow, MoneyValue, NumberValue } from '@/components/tools/detail-field';
import { LaunchToolButton } from '@/components/tools/launch-tool-button';
import { StatusTransitionDialog } from '@/components/tools/status-transition-dialog';
import { ToolDetailTabs, type DetailTab } from '@/components/tools/tool-detail-tabs';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EVALUATION_CRITERIA, EVALUATION_CRITERION_LABELS } from '@/domain/evaluation/types';
import { REVIEW_COMMENT_KIND_LABELS } from '@/domain/review/types';
import {
  AUTOMATION_LEVEL_LABELS,
  TOOL_STATUS_DESCRIPTIONS,
  TOOL_STATUS_LABELS,
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
  const integrationNames = version.integrations.map((integration) => ({
    name:
      detail.integrationSystems.find((system) => system.id === integration.integrationSystemId)
        ?.name ?? '알 수 없는 시스템',
    note: integration.note,
  }));

  const tabs: DetailTab[] = [
    {
      value: 'overview',
      label: '개요',
      content: (
        <FieldList>
          <FieldRow label="한 줄 소개" value={tool.summary} />
          <FieldRow label="설명" value={version.description} multiline />
          <FieldRow label="해결하려는 문제" value={version.problemStatement} multiline />
          <FieldRow label="카테고리" value={detail.categoryName} />
          <FieldRow
            label="개발자"
            value={detail.developerNames.length > 0 ? detail.developerNames.join(', ') : ''}
          />
          <FieldRow
            label="태그"
            value={tool.tags.length > 0 ? tool.tags.join(', ') : ''}
          />
          <FieldRow
            label="조회 / 실행"
            value={`${detail.usage.views.toLocaleString('ko-KR')}회 / ${detail.usage.launches.toLocaleString('ko-KR')}회`}
          />
        </FieldList>
      ),
    },
    {
      value: 'features',
      label: '기능',
      content: (
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
          <FieldRow label="자동화 수준" value={AUTOMATION_LEVEL_LABELS[version.automationLevel]} />
          <FieldRow label="입력 자료" value={version.inputData} multiline />
          <FieldRow label="결과물" value={version.outputData} multiline />
          <FieldRow label="예상 사용자" value={version.expectedUsers} />
          <FieldRow
            label="월 예상 사용"
            value={<NumberValue value={version.monthlyExpectedUsage} unit="회" />}
          />
        </FieldList>
      ),
    },
    {
      value: 'workflow',
      label: '업무 흐름',
      content: (
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
      ),
    },
    {
      value: 'integrations',
      label: '연동',
      count: integrationNames.length,
      content:
        integrationNames.length === 0 && !version.otherIntegrationNote ? (
          <EmptyState title="연동하는 시스템이 없습니다" description="독립적으로 동작하는 도구입니다." />
        ) : (
          <FieldList>
            {integrationNames.map((integration) => (
              <FieldRow
                key={integration.name}
                label={integration.name}
                value={integration.note || '연동함'}
              />
            ))}
            <FieldRow label="그 밖의 연동" value={version.otherIntegrationNote} />
          </FieldList>
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

          <PhaseNotice
            phase="PHASE_2"
            feature="위험도 자동 평가"
            fallback="지금은 검토자가 체크리스트를 직접 작성해 등급을 정합니다."
          />
        </div>
      ),
    },
    {
      value: 'cost',
      label: '비용',
      content: (
        <FieldList>
          <FieldRow
            label="초기 개발 비용"
            value={<MoneyValue amount={version.cost.initialDevelopmentCost} />}
          />
          <FieldRow
            label="월 운영 비용"
            value={<MoneyValue amount={version.cost.monthlyOperationCost} />}
          />
          <FieldRow label="월 LLM 비용" value={<MoneyValue amount={version.cost.monthlyLlmCost} />} />
          <FieldRow
            label="외부 서비스 구독료"
            value={<MoneyValue amount={version.cost.externalServiceCost} />}
          />
          <FieldRow label="1인당 비용" value={<MoneyValue amount={version.cost.costPerUser} />} />
          <FieldRow label="산정 근거" value={version.cost.costBasis} multiline />
        </FieldList>
      ),
    },
    {
      value: 'performance',
      label: '성과',
      content: (
        <FieldList>
          <FieldRow
            label="현재 처리 시간"
            value={<NumberValue value={version.performance.currentProcessingMinutes} unit="분" />}
          />
          <FieldRow
            label="자동화 후 처리 시간"
            value={<NumberValue value={version.performance.automatedProcessingMinutes} unit="분" />}
          />
          <FieldRow
            label="월 절감 시간"
            value={<NumberValue value={version.performance.monthlySavedHours} unit="시간" />}
          />
          <FieldRow label="오류 감소 효과" value={version.performance.errorReductionNote} />
          <FieldRow label="기대 효과" value={version.performance.expectedBenefit} multiline />
          <FieldRow label="측정 방법" value={version.performance.measurementMethod} />
        </FieldList>
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
            <div className="rounded-card border border-border p-4">
              <h3 className="text-sm font-semibold text-fg">
                항목별 평균 ({detail.evaluationSummary.count}건)
              </h3>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {EVALUATION_CRITERIA.map((criterion) => (
                  <div key={criterion} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-fg-muted">{EVALUATION_CRITERION_LABELS[criterion]}</dt>
                    <dd className="tabular-nums text-fg">
                      {detail.evaluationSummary.averages?.[criterion]?.toFixed(1) ?? '-'} / 5
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <ul className="flex flex-col gap-3">
              {detail.evaluations.map((evaluation) => (
                <li key={evaluation.id} className="rounded-card border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-fg">{evaluation.evaluatorName}</p>
                    <p className="text-xs text-fg-subtle">
                      종합 {evaluation.scores.overall}점 · {formatDateTime(evaluation.createdAt)}
                      {evaluation.revisionCount > 0
                        ? ` · ${evaluation.revisionCount}회 수정됨`
                        : ''}
                    </p>
                  </div>
                  {evaluation.comment ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">
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
      value: 'versions',
      label: '버전',
      count: detail.versions.length,
      content: (
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-fg">{tool.name}</h1>
              <ToolStatusBadge status={tool.status} />
            </div>
            <p className="mt-1 text-sm text-fg-muted">{TOOL_STATUS_DESCRIPTIONS[tool.status]}</p>
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

            {version.serviceUrl ? (
              <LaunchToolButton toolId={tool.id} serviceUrl={version.serviceUrl} />
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

        {detail.attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {detail.attachments.map((attachment) => (
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

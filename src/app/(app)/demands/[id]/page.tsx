import { Lock, Pencil } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadDemandDetail } from '@/application/demands/query';
import { PhaseNotice } from '@/components/common/phase-notice';
import { DemandStatusBadge, ToolStatusBadge } from '@/components/common/status-badge';
import { DemandActionsPanel } from '@/components/demands/demand-actions-panel';
import { MatchToolDialog, UnlinkToolButton } from '@/components/demands/match-tool-dialog';
import { FieldList, FieldRow, NumberValue } from '@/components/tools/detail-field';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  MATCH_TYPE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  WORK_FREQUENCY_LABELS,
} from '@/domain/demand/types';
import type { ToolStatus } from '@/domain/tool/types';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDate, formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '수요 상세' };

export default async function DemandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await guardPage(() => loadDemandDetail(id));
  const { demand, permissions } = detail;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-fg">{demand.title}</h1>
            <DemandStatusBadge status={demand.status} />
            {demand.containsPersonalData ? (
              <Badge tone="danger" icon={Lock}>
                개인정보 포함
              </Badge>
            ) : null}
            {demand.containsAcademicOrResearchData ? (
              <Badge tone="warning" icon={Lock}>
                학사·연구 정보 포함
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {detail.departmentName} · {detail.requesterName} 등록 ·{' '}
            {formatDateTime(demand.createdAt)}
          </p>
        </div>

        {permissions.canEdit ? (
          <Button variant="secondary" asChild>
            <Link href={`/demands/${demand.id}/edit`}>
              <Pencil aria-hidden="true" />
              수정
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>업무 내용</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldList>
                <FieldRow
                  label="현재 처리 방식"
                  value={demand.currentWorkDescription}
                  multiline
                />
                <FieldRow label="가장 번거로운 단계" value={demand.mostPainfulStep} multiline />
                <FieldRow label="다루는 자료" value={demand.inputMaterials} multiline />
                <FieldRow label="원하는 결과물" value={demand.desiredOutcome} multiline />
                <FieldRow label="사용 중인 시스템" value={demand.systemsInUse} />
                <FieldRow
                  label="업무 주기"
                  value={WORK_FREQUENCY_LABELS[demand.workFrequency]}
                />
                <FieldRow
                  label="예상 사용 인원"
                  value={<NumberValue value={demand.expectedUserCount} unit="명" />}
                />
                <FieldRow
                  label="희망 완료 시기"
                  value={
                    demand.desiredCompletionDate
                      ? formatDate(demand.desiredCompletionDate)
                      : ''
                  }
                />
                <FieldRow
                  label="사람 최종 확인"
                  value={demand.requiresHumanApproval ? '필요' : '불필요'}
                />
              </FieldList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>필요한 기능</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-fg">꼭 필요한 기능</h3>
                {demand.requiredFeatures.length === 0 ? (
                  <p className="text-sm text-fg-subtle">미입력</p>
                ) : (
                  <ul className="list-inside list-disc text-sm text-fg">
                    {demand.requiredFeatures.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>

              {demand.optionalFeatures.length > 0 ? (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold text-fg">있으면 좋은 기능</h3>
                  <ul className="list-inside list-disc text-sm text-fg-muted">
                    {demand.optionalFeatures.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {demand.expectedBenefit ? (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold text-fg">기대 효과</h3>
                  <p className="whitespace-pre-wrap text-sm text-fg-muted">
                    {demand.expectedBenefit}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>연결된 도구 ({detail.matches.length})</CardTitle>
                <p className="text-sm text-fg-muted">
                  검토자가 직접 확인하고 연결한 도구입니다.
                </p>
              </div>
              {permissions.canMatch ? (
                <MatchToolDialog demandId={demand.id} tools={detail.linkableTools} />
              ) : null}
            </CardHeader>

            <CardContent>
              {detail.matches.length === 0 ? (
                <EmptyState
                  title="아직 연결된 도구가 없습니다"
                  description={
                    permissions.canMatch
                      ? '이 수요를 해결할 수 있는 도구가 있으면 연결해 주세요.'
                      : '검토자가 확인 후 기존 도구를 연결하거나 신규 개발로 넘깁니다.'
                  }
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {detail.matches.map((match) => (
                    <li key={match.id} className="rounded-card border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/tools/${match.toolId}`}
                              className="font-medium text-fg hover:underline"
                            >
                              {match.toolName}
                            </Link>
                            <ToolStatusBadge status={match.toolStatus as ToolStatus} />
                            <Badge tone="primary">{MATCH_TYPE_LABELS[match.matchType]}</Badge>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-fg-muted">
                            {match.rationale}
                          </p>
                          <p className="mt-1 text-xs text-fg-subtle">
                            {match.matchedByName} · {formatDateTime(match.matchedAt)}
                          </p>
                        </div>

                        {permissions.canMatch ? (
                          <UnlinkToolButton
                            demandId={demand.id}
                            matchId={match.id}
                            toolName={match.toolName}
                          />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>참여 신청 ({detail.participants.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.participants.length === 0 ? (
                <EmptyState
                  title="아직 참여 신청이 없습니다"
                  description="개발자가 이 수요를 보고 참여를 신청하면 여기에 표시됩니다."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {detail.participants.map((participant) => (
                    <li key={participant.id} className="rounded-card border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-fg">{participant.userName}</span>
                        {participant.departmentName ? (
                          <span className="text-xs text-fg-subtle">
                            {participant.departmentName}
                          </span>
                        ) : null}
                        <Badge tone="info">
                          {PARTICIPANT_ROLE_LABELS[participant.participantRole]}
                        </Badge>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-fg-muted">
                        {participant.message}
                      </p>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {formatDateTime(participant.joinedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          {demand.status === 'DRAFT' ? (
            <Alert tone="info" title="아직 공개되지 않았습니다">
              공개해야 다른 구성원이 이 수요를 볼 수 있고, 도구 연결이나 참여 신청을 받을 수
              있습니다.
            </Alert>
          ) : null}

          <DemandActionsPanel
            demandId={demand.id}
            transitions={detail.transitions}
            canJoin={permissions.canJoin}
            alreadyJoined={permissions.alreadyJoined}
          />

          <PhaseNotice
            phase="PHASE_2"
            feature="수요-도구 자동 매칭"
            fallback="지금은 검토자가 도구를 직접 찾아 연결하고 사유를 남깁니다."
          />
        </div>
      </div>
    </div>
  );
}

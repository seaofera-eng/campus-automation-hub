import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadImprovementDetail } from '@/application/improvements/query';
import { ImprovementStatusBadge } from '@/components/common/status-badge';
import { ImprovementActionsPanel } from '@/components/improvements/improvement-actions-panel';
import { FieldList, FieldRow } from '@/components/tools/detail-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IMPACT_LEVEL_LABELS,
  IMPROVEMENT_STATUS_LABELS,
  IMPROVEMENT_TYPE_LABELS,
  URGENCY_LEVEL_LABELS,
} from '@/domain/improvement/types';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDate, formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '개선 요청 상세' };

export default async function ImprovementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await guardPage(() => loadImprovementDetail(id));
  const { request } = detail;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-fg">{request.title}</h1>
            <ImprovementStatusBadge status={request.status} />
            <Badge tone="neutral">{IMPROVEMENT_TYPE_LABELS[request.requestType]}</Badge>
            {request.urgency === 'HIGH' ? (
              <Badge tone="danger" icon={AlertTriangle}>
                시급
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {detail.requesterName} 요청 · {formatDateTime(request.createdAt)}
            {detail.assigneeName ? ` · ${detail.assigneeName} 담당` : ' · 담당자 미배정'}
          </p>
        </div>

        {detail.toolId ? (
          <Button variant="secondary" asChild>
            <Link href={`/tools/${detail.toolId}`}>
              <ExternalLink aria-hidden="true" />
              {detail.toolName}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>요청 내용</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-fg">{request.detail}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>요청 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldList>
                <FieldRow label="대상 도구" value={detail.toolName} />
                <FieldRow
                  label="요청 유형"
                  value={IMPROVEMENT_TYPE_LABELS[request.requestType]}
                />
                <FieldRow
                  label="업무 영향도"
                  value={IMPACT_LEVEL_LABELS[request.businessImpact]}
                />
                <FieldRow label="시급도" value={URGENCY_LEVEL_LABELS[request.urgency]} />
                <FieldRow label="담당자" value={detail.assigneeName} />
                <FieldRow
                  label="목표 완료일"
                  value={
                    request.targetCompletionDate
                      ? formatDate(request.targetCompletionDate)
                      : ''
                  }
                />
                <FieldRow label="처리 의견" value={request.handlingComment} multiline />
              </FieldList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>처리 이력 ({detail.history.length})</CardTitle>
              <p className="text-sm text-fg-muted">
                상태가 바뀔 때마다 기록됩니다. 지우거나 고칠 수 없습니다.
              </p>
            </CardHeader>
            <CardContent>
              {detail.history.length === 0 ? (
                <p className="text-sm text-fg-muted">아직 상태가 바뀐 적이 없습니다.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {detail.history.map((entry) => (
                    <li key={entry.id} className="border-l-2 border-border pl-3">
                      <p className="text-sm text-fg">
                        {entry.fromStatus ? IMPROVEMENT_STATUS_LABELS[entry.fromStatus] : '신규'} →{' '}
                        <strong className="font-semibold">
                          {IMPROVEMENT_STATUS_LABELS[entry.toStatus]}
                        </strong>
                      </p>
                      {entry.comment ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-fg-muted">
                          {entry.comment}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-fg-subtle">
                        {entry.changedByName} · {formatDateTime(entry.changedAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <ImprovementActionsPanel
          improvementId={request.id}
          transitions={detail.transitions}
          canAssign={detail.permissions.canAssign}
          developers={detail.developers}
          currentAssigneeId={request.assignedDeveloperUserId}
          currentTargetDate={request.targetCompletionDate}
        />
      </div>
    </div>
  );
}

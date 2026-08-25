import { BadgeCheck, Ban, ClipboardCheck, FlaskConical, Lightbulb, Star, Wand2, Wrench } from 'lucide-react';
import Link from 'next/link';
import { loadDashboard } from '@/application/admin/dashboard';
import { BarList } from '@/components/dashboard/bar-list';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { guardPage } from '@/lib/auth/page-guard';
import { formatDateTime } from '@/lib/utils/datetime';

/**
 * 관리자 현황.
 *
 * 대시보드와 같은 집계를 쓰되, 상태별 분포를 함께 보여준다.
 * 관리자는 "전체가 어느 단계에 몰려 있는지"를 봐야 하기 때문이다.
 */
export default async function AdminOverviewPage() {
  const { stats, activity } = await guardPage(loadDashboard);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="등록된 도구" value={stats.totalTools} icon={Wrench} href="/tools" />
        <StatCard
          label="검토 대기"
          value={stats.awaitingReviewTools}
          icon={ClipboardCheck}
          href="/reviews"
          emphasis
        />
        <StatCard label="시범운영" value={stats.pilotTools} icon={FlaskConical} />
        <StatCard label="정식 승인" value={stats.approvedTools} icon={BadgeCheck} />
        <StatCard label="사용 중지" value={stats.suspendedTools} icon={Ban} />
        <StatCard label="진행 중 수요" value={stats.openDemands} icon={Lightbulb} href="/demands" />
        <StatCard
          label="처리 중 개선 요청"
          value={stats.openImprovements}
          icon={Wand2}
          href="/improvements"
        />
        <StatCard label="등록된 평가" value={stats.totalEvaluations} icon={Star} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>상태별 도구</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              caption="상태별 도구 수"
              items={stats.byStatus}
              emptyMessage="아직 등록된 도구가 없습니다."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>카테고리별 도구</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              caption="카테고리별 도구 수"
              items={stats.byCategory}
              emptyMessage="아직 등록된 도구가 없습니다."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>부서별 도구</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              caption="부서별 도구 수"
              items={stats.byDepartment}
              emptyMessage="아직 등록된 도구가 없습니다."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>최근 활동</CardTitle>
          <Link href="/admin/audit-logs" className="text-sm font-medium text-primary hover:underline">
            감사 로그 전체 보기 →
          </Link>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-fg-muted">아직 활동 기록이 없습니다.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {activity.map((entry) => (
                <li key={entry.id} className="border-l-2 border-border pl-3">
                  <p className="text-sm text-fg">
                    {entry.linkPath ? (
                      <Link href={entry.linkPath} className="hover:underline">
                        {entry.description}
                      </Link>
                    ) : (
                      entry.description
                    )}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {entry.actorName} ·{' '}
                    <time dateTime={entry.occurredAt}>
                      {formatDateTime(entry.occurredAt)}
                    </time>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

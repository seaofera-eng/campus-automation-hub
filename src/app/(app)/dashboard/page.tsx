import {
  BadgeCheck,
  Ban,
  ClipboardCheck,
  FlaskConical,
  Lightbulb,
  Star,
  Wand2,
  Wrench,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadDashboard } from '@/application/admin/dashboard';
import { BarList } from '@/components/dashboard/bar-list';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ACCOUNT_TYPE_LABELS, hasAdminPermission } from '@/domain/authz/accounts';
import { formatDateTime } from '@/lib/utils/datetime';

export const metadata: Metadata = { title: '대시보드' };

export default async function DashboardPage() {
  const { profile, stats, activity } = await loadDashboard();

  // 이용자는 수요와 도구를 함께 쓰므로 둘 다 강조한다.
  // 검토 권한이 있는 사람에게만 검토 지표를 앞세운다.
  const canReview = hasAdminPermission(profile.accountType, profile.adminPermissions, 'REVIEW');
  const emphasis = { review: canReview };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-fg">대시보드</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {profile.name} 님({ACCOUNT_TYPE_LABELS[profile.accountType]})의 현재 현황입니다.
        </p>
      </div>

      {/* 리뷰 3절: "[지표 카드]는 수요자 중심과 개발자 중심을 구분해서 보여줘야 함."
          한 사람이 두 역할을 다 하므로 계정으로 나누지 않고 관점으로 나눈다. */}
      <section aria-labelledby="demand-stats-heading">
        <h2 id="demand-stats-heading" className="mb-2 text-sm font-semibold text-fg">
          필요한 것을 찾을 때
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="쓸 수 있는 도구"
            value={stats.approvedTools + stats.pilotTools}
            icon={BadgeCheck}
            hint="정식 승인 · 시범운영"
            href="/tools"
            emphasis
          />
          <StatCard label="등록된 도구 전체" value={stats.totalTools} icon={Wrench} href="/tools" />
          <StatCard
            label="내가 낸 요청"
            value={stats.openImprovements}
            icon={Wand2}
            hint="처리 중인 개선 요청"
            href="/improvements"
          />
          <StatCard label="남긴 평가" value={stats.totalEvaluations} icon={Star} />
        </div>
      </section>

      <section aria-labelledby="build-stats-heading">
        <h2 id="build-stats-heading" className="mb-2 text-sm font-semibold text-fg">
          만들어 볼 때
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="기다리는 수요"
            value={stats.openDemands}
            icon={Lightbulb}
            hint="공개 · 연결됨 · 개발 중"
            href="/demands"
            emphasis
          />
          <StatCard label="시범운영 중" value={stats.pilotTools} icon={FlaskConical} href="/tools" />
          <StatCard
            label="검토 대기"
            value={stats.awaitingReviewTools}
            icon={ClipboardCheck}
            hint="신청 · 검토 중 · 보완 요청"
            href={canReview ? '/reviews' : '/tools'}
            emphasis={emphasis.review}
          />
          <StatCard label="사용 중지" value={stats.suspendedTools} icon={Ban} href="/tools" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 도구</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              caption="카테고리별 등록 도구 수"
              items={stats.byCategory}
              emptyMessage="아직 등록된 도구가 없습니다."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>실행 환경별 도구</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              caption="실행 방식별 등록 도구 수"
              items={stats.byRuntime}
              emptyMessage="아직 등록된 도구가 없습니다."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState
              title="아직 활동 기록이 없습니다"
              description="도구를 등록하거나 업무 수요를 올리면 여기에 표시됩니다."
              action={
                <Link href="/tools" className="text-sm font-medium text-primary hover:underline">
                  도구 목록 보기 →
                </Link>
              }
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {activity.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
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

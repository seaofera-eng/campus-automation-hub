import 'server-only';
import { DEMAND_STATUS_LABELS } from '@/domain/demand/types';
import { IMPROVEMENT_STATUS_LABELS } from '@/domain/improvement/types';
import type { ActivityEntry, DashboardStats } from '@/domain/observability/types';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import { TOOL_STATUS_LABELS, TOOL_STATUSES } from '@/domain/tool/types';
import type { Profile } from '@/domain/identity/types';
import { requireUser } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 대시보드 집계 (요구사항 11번).
 *
 * 모든 역할이 볼 수 있는 화면이라 `admin:dashboard` 권한을 요구하지 않는다.
 * 대신 각 숫자는 저장소의 조회 권한(그리고 Supabase 모드에서는 RLS)이 걸러 준다.
 */

export interface DashboardData {
  profile: Profile;
  stats: DashboardStats;
  activity: ActivityEntry[];
}

export async function loadDashboard(): Promise<DashboardData> {
  const profile = await requireUser();
  const repositories = getRepositories();
  const campusId = profile.campusId;

  const [toolCounts, demandCounts, improvementCounts, evaluationCount, activity, categories, departments] =
    await Promise.all([
      repositories.tools.countByStatus(campusId),
      repositories.demands.countByStatus(campusId),
      repositories.improvements.countByStatus(campusId),
      repositories.evaluations.countAll(campusId),
      repositories.observability.listRecentActivity(campusId, 8),
      repositories.reference.listCategories(campusId),
      repositories.identity.listDepartments(campusId),
    ]);

  // 카테고리별·부서별 분포는 목록을 한 번 읽어 애플리케이션에서 센다.
  // 1단계 규모(수십~수백 건)에서는 충분하고, 저장소 인터페이스를 단순하게 유지할 수 있다.
  const toolPage = await repositories.tools.listTools({ campusId }, 'RECENT', {
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  });

  const categoryCounts = new Map<string, number>();
  const departmentCounts = new Map<string, number>();
  for (const tool of toolPage.items) {
    categoryCounts.set(tool.categoryId, (categoryCounts.get(tool.categoryId) ?? 0) + 1);
    departmentCounts.set(tool.departmentId, (departmentCounts.get(tool.departmentId) ?? 0) + 1);
  }

  const totalTools = TOOL_STATUSES.reduce((sum, status) => sum + toolCounts[status], 0);

  const stats: DashboardStats = {
    totalTools,
    // "검토 대기"는 신청·검토중·보완요청을 합친 값이다. 리뷰어가 실제로 신경 써야 할 건수.
    awaitingReviewTools:
      toolCounts.SUBMITTED + toolCounts.HUMAN_REVIEW + toolCounts.REVISION_REQUIRED,
    pilotTools: toolCounts.PILOT,
    approvedTools: toolCounts.APPROVED,
    suspendedTools: toolCounts.SUSPENDED,
    openDemands: demandCounts.OPEN + demandCounts.MATCHED + demandCounts.IN_DEVELOPMENT,
    openImprovements:
      improvementCounts.OPEN + improvementCounts.REVIEWING + improvementCounts.IN_PROGRESS,
    totalEvaluations: evaluationCount,
    byCategory: categories
      .map((category) => ({ label: category.name, count: categoryCounts.get(category.id) ?? 0 }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count),
    byDepartment: departments
      .map((department) => ({
        label: department.name,
        count: departmentCounts.get(department.id) ?? 0,
      }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count),
    byStatus: TOOL_STATUSES.map((status) => ({
      label: TOOL_STATUS_LABELS[status],
      count: toolCounts[status],
    })).filter((entry) => entry.count > 0),
  };

  return { profile, stats, activity };
}

/** 대시보드 하단에 상태별 요약을 문장으로 붙일 때 쓴다. */
export const STATUS_LABEL_SOURCES = {
  tool: TOOL_STATUS_LABELS,
  demand: DEMAND_STATUS_LABELS,
  improvement: IMPROVEMENT_STATUS_LABELS,
} as const;

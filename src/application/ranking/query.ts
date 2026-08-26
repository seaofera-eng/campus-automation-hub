import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import { summarizeEvaluations } from '@/domain/evaluation/scoring';
import type { Profile } from '@/domain/identity/types';
import {
  buildRanking,
  recommendedFrom,
  type RankingEntry,
  type RankingInput,
  type RankingSnapshot,
} from '@/domain/ranking';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 도구 순위 (요구사항 "순위 추천").
 *
 * ## 계산해서 보여 준다. 저장하지 않는다.
 *
 * 순위는 평가·사용 기록·개선 요청이 바뀔 때마다 달라진다. 미리 계산해 저장해
 * 두면 어제 순위를 오늘 보여 주게 된다. 도구 수가 수백 건 수준이라 매번
 * 계산해도 부담이 없다.
 *
 * 도구가 수천 건이 되면 `ranking_snapshots` 에 담아 하루 한 번 만드는 쪽으로
 * 옮겨야 한다. 그때를 위해 스냅샷에 가중치와 보정 기준이 함께 들어 있다.
 *
 * ## AI 를 쓰지 않는다
 *
 * 순위는 있는 기록을 세는 일이다. 모델을 부를 이유가 없고, 부르면 오히려
 * "왜 이 순위냐"에 답할 수 없게 된다. 여기 숫자는 전부 다시 계산해 검증할 수
 * 있다.
 */

export interface RankingEntryView extends Omit<RankingEntry, 'toolId'> {
  toolId: string;
  summary: string;
  categoryName: string;
  status: string;
  /** 평가 평균 (1~5). 평가가 없으면 null — 0 으로 채우지 않는다. */
  averageScore: number | null;
  distinctLaunchUsers: number;
}

export interface RankingView {
  actor: Profile;
  /** 추천으로 내보내는 상위 도구. 표본이 모자란 것은 빠진다. */
  recommended: RankingEntryView[];
  /** 전체 순위표. 표본이 모자란 도구도 표시를 달고 들어간다. */
  entries: RankingEntryView[];
  /** 순위에서 빠진 도구와 사유 */
  excluded: RankingSnapshot['excluded'];
  weights: RankingSnapshot['weights'];
  guards: RankingSnapshot['guards'];
  campusAverage: number;
  generatedAt: string;
}

/** 추천 칸에 몇 개를 보여 줄지. */
export const RECOMMENDED_LIMIT = 3;

export async function loadRanking(): Promise<RankingView> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'tool:read');

  const repositories = getRepositories();
  const [page, categories, launchUsers] = await Promise.all([
    repositories.tools.listTools({ campusId: actor.campusId }, 'RECENT', {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    }),
    repositories.reference.listCategories(actor.campusId),
    repositories.observability.countDistinctLaunchUsers(actor.campusId),
  ]);

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  const gathered = await Promise.all(
    page.items.map(async (tool) => {
      const [evaluations, improvements, checklist, version] = await Promise.all([
        repositories.evaluations.listByTool(tool.id),
        repositories.improvements.listByTool(tool.id),
        repositories.reviews.getChecklist(tool.currentVersionId),
        repositories.tools.getVersion(tool.currentVersionId),
      ]);

      const summary = summarizeEvaluations(evaluations);

      // '열려 있는 오류 신고' — 접수됐지만 아직 반영도 반려도 되지 않은 것.
      const openBugReports = improvements.filter(
        (request) =>
          request.requestType === 'BUG_FIX' &&
          request.deletedAt === null &&
          ['OPEN', 'REVIEWING', 'ACCEPTED', 'IN_PROGRESS'].includes(request.status),
      ).length;

      const resolvedRequests = improvements.filter(
        (request) => request.deletedAt === null && request.status === 'RELEASED',
      ).length;

      const input: RankingInput = {
        toolId: tool.id,
        name: tool.name,
        status: tool.status,
        evaluationCount: summary.count,
        averageScore: summary.averageOverall,
        distinctLaunchUsers: launchUsers[tool.id] ?? 0,
        openBugReports,
        resolvedRequests,
        riskLevel: checklist?.riskLevel ?? null,
        lastUpdatedAt: version?.updatedAt ?? tool.updatedAt,
      };

      return { tool, input, summary };
    }),
  );

  const snapshot = buildRanking(
    gathered.map((entry) => entry.input),
    { now: new Date() },
  );

  const byToolId = new Map(gathered.map((entry) => [entry.tool.id as string, entry]));

  function toView(entry: RankingEntry): RankingEntryView {
    const source = byToolId.get(entry.toolId as string);
    return {
      ...entry,
      toolId: entry.toolId as string,
      summary: source?.tool.summary ?? '',
      categoryName: source ? (categoryNames.get(source.tool.categoryId) ?? '미분류') : '미분류',
      status: source?.tool.status ?? 'APPROVED',
      averageScore: source?.summary.averageOverall ?? null,
      distinctLaunchUsers: source?.input.distinctLaunchUsers ?? 0,
    };
  }

  return {
    actor,
    recommended: recommendedFrom(snapshot, RECOMMENDED_LIMIT).map(toView),
    entries: snapshot.entries.map(toView),
    excluded: snapshot.excluded,
    weights: snapshot.weights,
    guards: snapshot.guards,
    campusAverage: snapshot.campusAverage,
    generatedAt: snapshot.generatedAt,
  };
}

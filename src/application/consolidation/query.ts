import 'server-only';
import type { DuplicateVerdict } from '@/domain/analysis/types';
import { assertCan } from '@/domain/authz/policies';
import {
  buildConsolidationGroups,
  buildFeatureMatrix,
  missingFromBase,
  suggestBaseTool,
  type ConsolidationEdge,
} from '@/domain/consolidation';
import type { Profile } from '@/domain/identity/types';
import { josa } from '@/domain/shared/josa';
import type { ToolStatus } from '@/domain/tool/types';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 통합 표준화 화면 (요구사항 "기존 도구를 참고해 업데이트·통합 표준화").
 *
 * ## 이미 나온 판정을 다시 쓴다
 *
 * 모델을 부르지 않는다. `pnpm ai:analyze` 가 남겨 둔 중복 판정을 읽어 묶고,
 * 기능을 나란히 놓는다. 전부 다시 계산해 검증할 수 있는 값이다.
 *
 * 그래서 **중복 분석을 돌리지 않았으면 여기도 비어 있다.** 그건 "겹치는 도구가
 * 없다"와 다르고, 화면에서도 다르게 적는다.
 */

export interface ConsolidationToolView {
  toolId: string;
  name: string;
  summary: string;
  status: ToolStatus;
  categoryName: string;
  ownerName: string;
  /** 이 도구가 이 묶음에서 가진 기능 수 */
  featureCount: number;
  /** 통합의 기준으로 제안된 도구인가 */
  isSuggestedBase: boolean;
}

export interface FeatureRowView {
  label: string;
  /** 도구 id → 그 도구가 원래 쓴 표현. 없으면 그 도구엔 없는 기능이다. */
  byTool: Record<string, string>;
  /** 몇 개 도구가 가지고 있는지 */
  count: number;
}

export interface ConsolidationGroupView {
  /** 화면에서 묶음을 가리키는 값. 도구 id 를 이어 붙인 것이라 매번 같다. */
  key: string;
  tools: ConsolidationToolView[];
  strongestVerdict: DuplicateVerdict;
  highestScore: number;
  featureRows: FeatureRowView[];
  /** 기준 도구에 없어서 흡수해야 할 기능. 그대로 개선 요청 내용이 된다. */
  absorbable: { label: string; fromToolNames: string[] }[];
  suggestedBaseToolId: string | null;
}

export interface ConsolidationView {
  actor: Profile;
  groups: ConsolidationGroupView[];
  /** 중복 분석이 있는 도구 수. 0 이면 아직 안 돌린 것이다. */
  analyzedToolCount: number;
}

export async function loadConsolidation(): Promise<ConsolidationView> {
  const actor = await requireUser();
  // 통합은 남의 도구를 건드리자는 제안이다. 도구 관리 권한이 있어야 한다.
  assertCan(toActor(actor), 'admin:consolidation');

  const repositories = getRepositories();
  const [analyses, categories, profiles] = await Promise.all([
    repositories.analyses.listDuplicateAnalyses(actor.campusId),
    repositories.reference.listCategories(actor.campusId),
    repositories.identity.listProfiles(actor.campusId),
  ]);

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  const edges: ConsolidationEdge[] = analyses.flatMap((analysis) =>
    analysis.findings.map((finding) => ({
      fromToolId: analysis.toolId,
      toToolId: finding.candidateToolId,
      verdict: finding.verdict,
      score: finding.score,
    })),
  );

  const groups = buildConsolidationGroups(edges);

  const views = await Promise.all(
    groups.map(async (group): Promise<ConsolidationGroupView | null> => {
      const tools = await Promise.all(
        group.toolIds.map(async (toolId) => {
          const tool = await repositories.tools.getTool(toolId);
          if (!tool || tool.deletedAt !== null) return null;
          const version = await repositories.tools.getVersion(tool.currentVersionId);
          return { tool, version };
        }),
      );

      const live = tools.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      // 분석 이후 도구가 지워져 한 건만 남았으면 묶음이 아니다.
      if (live.length < 2) return null;

      const featureRows = buildFeatureMatrix(
        live.map((entry) => ({
          toolId: entry.tool.id,
          features: entry.version?.keyFeatures ?? [],
        })),
      );

      const baseToolId = suggestBaseTool(featureRows);
      const nameById = new Map(live.map((entry) => [entry.tool.id as string, entry.tool.name]));

      const featureCounts = new Map<string, number>();
      for (const row of featureRows) {
        for (const entry of row.presentIn) {
          const key = entry.toolId as string;
          featureCounts.set(key, (featureCounts.get(key) ?? 0) + 1);
        }
      }

      return {
        key: [...group.toolIds].map(String).sort().join('~'),
        tools: live.map((entry) => ({
          toolId: entry.tool.id as string,
          name: entry.tool.name,
          summary: entry.tool.summary,
          status: entry.tool.status,
          categoryName: categoryNames.get(entry.tool.categoryId) ?? '미분류',
          ownerName: personNames.get(entry.tool.ownerUserId) ?? '알 수 없음',
          featureCount: featureCounts.get(entry.tool.id as string) ?? 0,
          isSuggestedBase: baseToolId === entry.tool.id,
        })),
        strongestVerdict: group.strongestVerdict,
        highestScore: group.highestScore,
        featureRows: featureRows.map((row) => ({
          label: row.label,
          byTool: Object.fromEntries(
            row.presentIn.map((entry) => [entry.toolId as string, entry.asWritten]),
          ),
          count: row.presentIn.length,
        })),
        absorbable: baseToolId
          ? missingFromBase(featureRows, baseToolId).map((entry) => ({
              label: entry.label,
              fromToolNames: entry.fromToolIds.map(
                (id) => nameById.get(id as string) ?? '알 수 없음',
              ),
            }))
          : [],
        suggestedBaseToolId: (baseToolId as string | null) ?? null,
      };
    }),
  );

  return {
    actor,
    groups: views.filter((view): view is ConsolidationGroupView => view !== null),
    analyzedToolCount: analyses.length,
  };
}

/**
 * 흡수할 기능 목록을 개선 요청 초안 문장으로 바꾼다.
 *
 * 새 흐름을 만들지 않고 기존 개선 요청을 그대로 쓴다. 통합은 결국 "이 도구에
 * 이 기능을 넣어 달라"는 요청이고, 그건 이미 있는 흐름이다.
 */
export function buildConsolidationRequestDraft(
  baseToolName: string,
  absorbable: readonly { label: string; fromToolNames: string[] }[],
): { title: string; detail: string } {
  const lines = absorbable.map(
    (entry) => `- ${entry.label} (현재 ${entry.fromToolNames.join(', ')} 에 있음)`,
  );

  return {
    title: `${baseToolName}에 겹치는 도구의 기능 통합`,
    detail: [
      `${baseToolName}${josa(baseToolName, '과와')} 같은 일을 하는 도구가 함께 등록되어 있습니다.`,
      '통합 표준화 화면에서 확인한 결과, 아래 기능이 이 도구에는 없습니다.',
      '',
      ...lines,
      '',
      '이 기능들을 흡수하면 겹치는 도구를 정리할 수 있습니다.',
      '어느 도구를 남길지는 담당자와 상의가 필요합니다.',
    ].join('\n'),
  };
}

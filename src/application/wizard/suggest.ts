import 'server-only';
import { draftDemand } from '@/adapters/ai';
import { isAiEnabled } from '@/adapters/ai';
import { summarizeEvaluations } from '@/domain/evaluation/scoring';
import type { DemandDraft, WizardAnswers } from '@/domain/wizard';
import { answersAsSimilarityInput, composeDemandDraft } from '@/domain/wizard';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import { compareLexically, type SimilarityInput } from '@/domain/similarity';
import type { AutomationTool, AutomationToolVersion } from '@/domain/tool/types';
import { requireUser } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 맞춤 AI 찾기 마법사의 결과 (리뷰 2026-08-26 2절).
 *
 * ## 두 가지를 답한다
 *
 * 1. **이미 있는 도구로 되는가** — 글자 겹침 계산으로 후보를 추린다.
 *    모델을 부르지 않는다. 즉시 나오고, 같은 답이 항상 나오고, "왜 이게
 *    나왔냐"에 근거를 댈 수 있다.
 * 2. **없으면 수요로 등록** — 고른 것을 문장으로 조립하고, 모델이 있으면
 *    다듬는다.
 *
 * ## 여기 나오는 점수는 중복 점수가 아니다
 *
 * `domain/similarity` 가 내는 값은 **글자가 얼마나 겹치는지**일 뿐이다.
 * 화면에 퍼센트로 내보이지 않는다 — "84% 일치"라고 쓰면 시스템이 내용을
 * 이해했다는 뜻으로 읽힌다. 대신 "비슷해 보이는 도구"로만 제시하고,
 * 맞는지는 사람이 열어 보고 정한다.
 *
 * ## 추천이 없다고 도구가 없는 것은 아니다
 *
 * 문턱을 넘는 후보가 없으면 빈 목록을 준다. 억지로 상위 3개를 채우면
 * 관계없는 도구를 열어 보게 만들고, 결국 "이 추천은 못 믿겠다"가 된다.
 */

/** 이 아래로는 보여주지 않는다. 글자 겹침이 이 정도면 대개 남남이다. */
const MIN_OVERLAP_TO_SHOW = 12;

/** 화면에 몇 개까지. 세 개를 넘으면 고르는 일이 다시 숙제가 된다. */
const MAX_SUGGESTIONS = 3;

export interface ToolSuggestion {
  toolId: string;
  name: string;
  summary: string;
  categoryName: string;
  ownerName: string;
  /** 등록된 기능 중 앞의 몇 개. 열어 보기 전에 판단할 거리를 준다. */
  keyFeatures: string[];
  averageOverallScore: number | null;
  evaluationCount: number;
}

export interface WizardSuggestion {
  /** 비슷해 보이는 도구. 없으면 빈 배열이다. */
  tools: ToolSuggestion[];
  /** 비교 대상이 된 도구 수. "7개 중에서 찾았습니다"를 쓸 수 있게 준다. */
  comparedCount: number;
}

function toSimilarityInput(
  tool: AutomationTool,
  version: AutomationToolVersion | null,
  categoryName: string,
): SimilarityInput {
  return {
    id: tool.id as string,
    name: tool.name,
    problemStatement: version?.problemStatement ?? tool.summary,
    keyFeatures: version?.keyFeatures ?? [],
    inputData: version?.inputData ?? '',
    outputData: version?.outputData ?? '',
    categoryName,
    tags: tool.tags,
  };
}

/**
 * 고른 내용과 비슷한 도구를 찾는다.
 *
 * 쓸 수 있는 도구(시범운영·승인)만 본다. 임시저장이나 폐기된 도구를 추천하면
 * 눌러도 못 쓴다.
 */
export async function suggestTools(answers: WizardAnswers): Promise<WizardSuggestion> {
  const actor = await requireUser();
  const repositories = getRepositories();

  const page = await repositories.tools.listTools(
    { campusId: actor.campusId, statuses: ['PILOT', 'APPROVED'] },
    'RECENT',
    { page: 1, pageSize: MAX_PAGE_SIZE },
  );

  if (page.items.length === 0) return { tools: [], comparedCount: 0 };

  const [categories, profiles] = await Promise.all([
    repositories.reference.listCategories(actor.campusId),
    repositories.identity.listProfiles(actor.campusId),
  ]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  const versions = await Promise.all(
    page.items.map((tool) => repositories.tools.getVersion(tool.currentVersionId)),
  );

  const draft = composeDemandDraft(answers);
  const query = answersAsSimilarityInput(answers, draft);

  const scored = page.items.map((tool, index) => {
    const version = versions[index] ?? null;
    const categoryName = categoryNames.get(tool.categoryId) ?? '미분류';
    return {
      tool,
      version,
      categoryName,
      overlap: compareLexically(query, toSimilarityInput(tool, version, categoryName)),
    };
  });

  const picked = scored
    .filter((entry) => entry.overlap.overall >= MIN_OVERLAP_TO_SHOW)
    .sort((left, right) => right.overlap.overall - left.overlap.overall)
    .slice(0, MAX_SUGGESTIONS);

  const tools = await Promise.all(
    picked.map(async (entry) => {
      const summary = summarizeEvaluations(await repositories.evaluations.listByTool(entry.tool.id));
      return {
        toolId: entry.tool.id as string,
        name: entry.tool.name,
        summary: entry.tool.summary,
        categoryName: entry.categoryName,
        ownerName: personNames.get(entry.tool.ownerUserId) ?? '알 수 없음',
        keyFeatures: (entry.version?.keyFeatures ?? []).slice(0, 3),
        // 평가가 없으면 null 이다. 0 으로 채우면 "최악의 도구"로 읽힌다.
        averageOverallScore: summary.averageOverall,
        evaluationCount: summary.count,
      } satisfies ToolSuggestion;
    }),
  );

  return { tools, comparedCount: page.items.length };
}

export interface WizardDraftResult {
  draft: DemandDraft;
  /** 모델이 다듬었으면 모델 이름, 규칙으로 조립했으면 null */
  model: string | null;
  /**
   * 모델을 쓸 수 있는 상태였는데 실패했는가.
   * 화면에서 "AI 정리는 실패했지만 등록은 됩니다"를 구분해 보여주는 데 쓴다.
   */
  modelFailed: boolean;
}

/**
 * 수요 초안을 만든다.
 *
 * **모델이 없거나 실패해도 초안은 나온다.** 마법사를 끝까지 갔는데 등록을
 * 못 하는 상황을 만들지 않는다.
 */
export async function buildDemandDraft(answers: WizardAnswers): Promise<WizardDraftResult> {
  await requireUser();

  const baseline = composeDemandDraft(answers);

  if (!isAiEnabled()) {
    return { draft: baseline, model: null, modelFailed: false };
  }

  const polished = await draftDemand({ answers, baseline });
  if (!polished) {
    return { draft: baseline, model: null, modelFailed: true };
  }

  return { draft: polished.draft, model: polished.model, modelFailed: false };
}

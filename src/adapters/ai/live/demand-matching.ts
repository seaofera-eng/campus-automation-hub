import type {
  DemandAnalysis,
  DemandMatchFinding,
  DemandMatchOutcome,
} from '@/domain/analysis/types';
import type { DemandId, ToolId } from '@/domain/shared/ids';
import { shortlistCandidates, type SimilarityInput } from '@/domain/similarity';
import { JUDGE_MODEL, ask } from './client';
import { scrubDigest, type DemandDigest, type ToolDigest } from './redact';

/**
 * 수요 ↔ 도구 매칭.
 *
 * ## 이 기능이 답해야 하는 질문
 *
 * 누가 "이런 게 있으면 좋겠다"를 올렸을 때 물어야 할 것은 하나다.
 * **이미 있는 걸로 되는가?**
 *
 * 학내에 같은 도구가 세 개씩 생기는 건 대개 이 질문을 아무도 안 해서다.
 * 올린 사람은 뭐가 있는지 모르고, 만들 사람은 수요를 보고 바로 만들기 시작한다.
 *
 * 그래서 결과를 세 갈래로만 낸다 — 그대로 됨 / 조금 고치면 됨 / 새로 만들어야 함.
 * 가운데가 제일 값지다. 없는 기능 목록이 그대로 개발 범위가 된다.
 *
 * 중복 탐지와 같은 두 단계 구조다. 글자로 후보를 좁히고 모델을 한 번 부른다.
 */

const SYSTEM = `당신은 대학에서 "이런 업무 자동화가 있으면 좋겠다"는 요청을 받고,
이미 등록된 도구로 해결되는지 확인하는 사람을 돕습니다.

요청 내용과 기존 도구들을 읽고, 각 도구가 요청을 얼마나 채우는지 판단하세요.

지켜야 할 것:
- coveredFeatures 에는 요청한 기능 중 그 도구가 **이미 하는 것**만 적습니다.
  도구 설명에 없는 기능을 있다고 보지 마세요.
- missingFeatures 에는 그 도구가 못 하는 것을 적습니다. 이것이 개발 범위가 됩니다.
- 도구가 요청과 관련 없으면 결과에서 빼세요. 억지로 채우지 마세요.
- score 는 그 도구가 요청을 몇 퍼센트나 채우는지입니다. **0~100 사이의 정수**로
  적으세요. 0.8 같은 비율이 아니라 80 입니다.

outcome 은 전체 판단입니다:
- COVERED: 기존 도구 하나로 요청이 그대로 해결됩니다.
- PARTIAL: 기존 도구를 조금 고치거나 기능을 더하면 됩니다.
- NOT_COVERED: 맞는 도구가 없습니다. 새로 만들어야 합니다.

설명은 요청을 올린 사람이 읽습니다. 한국어로, 개발 용어 없이 씁니다.`;

const SCHEMA = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['COVERED', 'PARTIAL', 'NOT_COVERED'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          toolId: { type: 'string' },
          // 게이트웨이가 integer 에 minimum/maximum 을 받지 않는다.
          // 정수라는 것만 스키마로 막고, 범위는 프롬프트로 못 박는다.
          score: {
            type: 'integer',
            description: '요청을 몇 퍼센트나 채우는지. 0 부터 100 까지의 정수.',
          },
          coveredFeatures: { type: 'array', items: { type: 'string' } },
          missingFeatures: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
        },
        required: ['toolId', 'score', 'coveredFeatures', 'missingFeatures', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['outcome', 'findings'],
  additionalProperties: false,
} as const;

const OUTCOMES = new Set<string>(['COVERED', 'PARTIAL', 'NOT_COVERED']);

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

function validate(
  value: unknown,
  allowedIds: ReadonlySet<string>,
): { outcome: DemandMatchOutcome; findings: DemandMatchFinding[] } | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;

  const outcome = String(row.outcome ?? '');
  if (!OUTCOMES.has(outcome)) return null;

  const findings: DemandMatchFinding[] = [];
  for (const entry of Array.isArray(row.findings) ? row.findings : []) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as Record<string, unknown>;

    const toolId = String(item.toolId ?? '');
    // 보내지 않은 도구를 지어내면 화면에서 없는 링크가 된다.
    if (!allowedIds.has(toolId)) continue;

    const score = Number(item.score);
    if (!Number.isFinite(score)) continue;

    findings.push({
      toolId: toolId as ToolId,
      score: Math.min(100, Math.max(0, Math.round(score))),
      coveredFeatures: toStringArray(item.coveredFeatures),
      missingFeatures: toStringArray(item.missingFeatures),
      explanation: String(item.explanation ?? '').trim(),
    });
  }

  findings.sort((left, right) => right.score - left.score);

  // 맞는 도구를 하나도 못 찾았는데 COVERED 라고 하면 앞뒤가 안 맞는다.
  // 근거 쪽을 믿는다.
  const corrected: DemandMatchOutcome =
    findings.length === 0 ? 'NOT_COVERED' : (outcome as DemandMatchOutcome);

  return { outcome: corrected, findings };
}

/** 수요를 도구와 같은 모양으로 바꿔 글자 겹침을 계산한다. */
function demandAsSimilarityInput(demand: DemandDigest): SimilarityInput {
  return {
    id: demand.id,
    name: demand.title,
    problemStatement: `${demand.currentWorkDescription} ${demand.mostPainfulStep}`,
    keyFeatures: [...demand.requiredFeatures, ...demand.optionalFeatures],
    inputData: demand.inputMaterials,
    outputData: demand.desiredOutcome,
    // 수요에는 분류가 없다. 어느 도구와도 '같은 분류'가 되지 않게 둔다.
    categoryName: '',
    tags: [],
  };
}

function toolAsSimilarityInput(tool: ToolDigest): SimilarityInput {
  return {
    id: tool.id,
    name: tool.name,
    problemStatement: tool.problemStatement,
    keyFeatures: tool.keyFeatures,
    inputData: tool.inputData,
    outputData: tool.outputData,
    categoryName: tool.categoryName,
    tags: tool.tags,
  };
}

export interface DemandAnalysisRequest {
  demand: DemandDigest;
  /** 이미 등록된 도구들 */
  pool: readonly ToolDigest[];
  shortlistSize?: number;
}

export async function analyzeDemand(
  request: DemandAnalysisRequest,
): Promise<DemandAnalysis | null> {
  if (request.pool.length === 0) {
    return {
      demandId: request.demand.id as DemandId,
      outcome: 'NOT_COVERED',
      findings: [],
      comparedCount: 0,
      provenance: {
        model: JUDGE_MODEL,
        generatedAt: new Date().toISOString(),
        humanReviewed: false,
        reviewedBy: null,
        reviewedAt: null,
      },
    };
  }

  const shortlist = shortlistCandidates(
    demandAsSimilarityInput(request.demand),
    request.pool.map(toolAsSimilarityInput),
  );
  const shortlistedIds = new Set(shortlist.map((entry) => entry.candidateId));
  const candidates = request.pool.filter((entry) => shortlistedIds.has(entry.id));

  const payload = scrubDigest({ demand: request.demand, candidates });

  const answer = await ask({
    feature: 'demand-matching',
    model: JUDGE_MODEL,
    system: SYSTEM,
    prompt: [
      '## 올라온 요청',
      JSON.stringify(payload.demand, null, 2),
      '',
      `## 이미 등록된 도구 ${payload.candidates.length}건`,
      JSON.stringify(payload.candidates, null, 2),
    ].join('\n'),
    schema: SCHEMA as unknown as Record<string, unknown>,
    validate: (value) => validate(value, new Set(candidates.map((entry) => entry.id))),
  });

  if (!answer) return null;

  return {
    demandId: request.demand.id as DemandId,
    outcome: answer.value.outcome,
    findings: answer.value.findings,
    comparedCount: request.pool.length,
    provenance: {
      model: answer.usage.model,
      generatedAt: new Date().toISOString(),
      humanReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
    },
  };
}

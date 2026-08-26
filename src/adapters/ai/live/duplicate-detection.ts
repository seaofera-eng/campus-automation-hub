import type {
  DuplicateAnalysis,
  DuplicateFinding,
  DuplicateRecommendation,
  DuplicateVerdict,
} from '@/domain/analysis/types';
import type { ToolId, ToolVersionId } from '@/domain/shared/ids';
import { shortlistCandidates, type SimilarityInput } from '@/domain/similarity';
import { JUDGE_MODEL, ask } from './client';
import { scrubDigest, type ToolDigest } from './redact';

/**
 * 중복 자동화 탐지.
 *
 * ## 두 단계로 나눈 이유
 *
 * 도구가 N개일 때 새 도구 하나를 모든 도구와 모델로 비교하면 호출이 N번이다.
 * 등록이 늘수록 비용이 선형으로 늘고, 등록 한 건에 몇 분씩 걸린다.
 *
 * 그래서 글자 겹침으로 먼저 후보를 몇 개로 줄이고(공짜·즉시),
 * **모델은 한 번만** 부른다. 후보 전부를 한 프롬프트에 넣어 같이 판단시킨다.
 * 후보끼리 비교하며 볼 수 있어서 따로 묻는 것보다 판단이 낫다.
 *
 * ## 임베딩을 안 쓴 이유
 *
 * 임베딩이 있으면 의미 기반으로 후보를 고를 수 있어 더 좋다. 지금 쓰는
 * 제공자에 임베딩 엔드포인트가 없어서 글자 겹침으로 대신했다. 놓치는 경우
 * (같은 일을 전혀 다른 말로 쓴 도구)가 있어서, 같은 분류의 도구는 겹침이
 * 낮아도 후보에 남기는 보정을 넣었다.
 */

const SYSTEM = `당신은 대학의 업무 자동화 도구 등록을 검토하는 사람을 돕습니다.

새로 등록 신청된 도구가 이미 등록된 도구와 겹치는지 판단하세요.

판단 기준:
- 겹친다는 것은 "이름이 비슷하다"가 아니라 "같은 문제를 같은 방식으로 푼다"입니다.
- 입력과 출력이 같고 처리 과정이 같으면 사실상 같은 도구입니다.
- 대상 범위가 다르면(학부 vs 대학원, 부서별 서식이 다름) 별개일 수 있습니다.
- 판단이 서면 근거로 쓴 대목을 overlapping/distinct 에 그대로 옮겨 적으세요.
  지어내지 마세요. 등록 내용에 없는 것은 쓰지 않습니다.

처리 제안(recommendation):
- USE_EXISTING: 새로 만들 필요가 없습니다. 기존 것으로 됩니다.
- MERGE_INTO_EXISTING: 기존 도구에 기능을 더해 하나로 만드는 편이 낫습니다.
- DIFFERENTIATE: 둘 다 필요하지만 언제 어느 쪽을 쓰는지 구분이 필요합니다.
- PROCEED: 겹치지 않습니다. 그대로 진행하면 됩니다.

verdict 는 NEAR_IDENTICAL / HIGH_OVERLAP / RELATED / INDEPENDENT 중 하나입니다.
score 는 겹치는 정도이며 **0 부터 100 사이의 정수**로 적으세요. 0.8 같은 비율이
아니라 80 입니다. INDEPENDENT 인 후보는 결과에서 빼세요.

설명은 검토자가 읽습니다. 한국어로, 개발 용어 없이 씁니다.`;

const SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidateToolId: { type: 'string' },
          verdict: {
            type: 'string',
            enum: ['NEAR_IDENTICAL', 'HIGH_OVERLAP', 'RELATED', 'INDEPENDENT'],
          },
          // 게이트웨이가 integer 에 minimum/maximum 을 받지 않는다.
          // 정수라는 것만 스키마로 막고, 범위는 프롬프트로 못 박는다.
          score: {
            type: 'integer',
            description: '겹치는 정도. 0 부터 100 까지의 정수. 비율(0~1)이 아니다.',
          },
          overlapping: { type: 'array', items: { type: 'string' } },
          distinct: { type: 'array', items: { type: 'string' } },
          recommendation: {
            type: 'string',
            enum: ['USE_EXISTING', 'MERGE_INTO_EXISTING', 'DIFFERENTIATE', 'PROCEED'],
          },
          explanation: { type: 'string' },
        },
        required: [
          'candidateToolId',
          'verdict',
          'score',
          'overlapping',
          'distinct',
          'recommendation',
          'explanation',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['findings'],
  additionalProperties: false,
} as const;

const VERDICTS = new Set<DuplicateVerdict>([
  'NEAR_IDENTICAL',
  'HIGH_OVERLAP',
  'RELATED',
  'INDEPENDENT',
]);

const RECOMMENDATIONS = new Set<DuplicateRecommendation>([
  'USE_EXISTING',
  'MERGE_INTO_EXISTING',
  'DIFFERENTIATE',
  'PROCEED',
]);

interface RawFinding {
  candidateToolId: string;
  verdict: DuplicateVerdict;
  score: number;
  overlapping: string[];
  distinct: string[];
  recommendation: DuplicateRecommendation;
  explanation: string;
}

/**
 * 스키마를 통과해도 값이 말이 되는지 한 번 더 본다.
 *
 * 특히 `candidateToolId` — 우리가 보내지 않은 도구를 지어내면 화면에서
 * 존재하지 않는 도구를 가리키게 된다. 보낸 목록에 없는 id 는 버린다.
 */
function validate(value: unknown, allowedIds: ReadonlySet<string>): RawFinding[] | null {
  if (typeof value !== 'object' || value === null) return null;
  const findings = (value as { findings?: unknown }).findings;
  if (!Array.isArray(findings)) return null;

  const result: RawFinding[] = [];
  for (const entry of findings) {
    if (typeof entry !== 'object' || entry === null) continue;
    const row = entry as Record<string, unknown>;

    const candidateToolId = String(row.candidateToolId ?? '');
    if (!allowedIds.has(candidateToolId)) continue;

    const verdict = row.verdict as DuplicateVerdict;
    const recommendation = row.recommendation as DuplicateRecommendation;
    if (!VERDICTS.has(verdict) || !RECOMMENDATIONS.has(recommendation)) continue;
    if (verdict === 'INDEPENDENT') continue;

    const score = Number(row.score);
    if (!Number.isFinite(score)) continue;

    result.push({
      candidateToolId,
      verdict,
      score: Math.min(100, Math.max(0, Math.round(score))),
      overlapping: toStringArray(row.overlapping),
      distinct: toStringArray(row.distinct),
      recommendation,
      explanation: String(row.explanation ?? '').trim(),
    });
  }
  return result;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

function toSimilarityInput(digest: ToolDigest): SimilarityInput {
  return {
    id: digest.id,
    name: digest.name,
    problemStatement: digest.problemStatement,
    keyFeatures: digest.keyFeatures,
    inputData: digest.inputData,
    outputData: digest.outputData,
    categoryName: digest.categoryName,
    tags: digest.tags,
  };
}

export interface DuplicateAnalysisRequest {
  toolVersionId: ToolVersionId;
  source: ToolDigest;
  /** 이미 등록된 도구들. 본인은 있어도 되고 없어도 된다 — 걸러 낸다. */
  pool: readonly ToolDigest[];
  shortlistSize?: number;
}

/**
 * 중복 분석 한 건.
 *
 * 키가 없거나 호출이 실패하면 `null`. 호출부는 그걸 "분석 없음"으로 다룬다.
 * 없는 것과 "겹치는 도구가 없다"는 다르다 — 후자는 findings 가 빈 배열인
 * 정상 결과다.
 */
export async function analyzeDuplicates(
  request: DuplicateAnalysisRequest,
): Promise<DuplicateAnalysis | null> {
  const pool = request.pool.filter((entry) => entry.id !== request.source.id);

  // 비교할 상대가 없으면 모델을 부를 이유가 없다. 첫 번째 도구가 이 경우다.
  if (pool.length === 0) {
    return {
      toolVersionId: request.toolVersionId,
      toolId: request.source.id as ToolId,
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
    toSimilarityInput(request.source),
    pool.map(toSimilarityInput),
    request.shortlistSize,
  );
  const lexicalById = new Map(shortlist.map((entry) => [entry.candidateId, entry.overall]));
  const candidates = pool.filter((entry) => lexicalById.has(entry.id));

  // 개인정보 가리기는 여기 한 곳에서만 한다. 이 뒤로는 원문이 없다.
  const payload = scrubDigest({ source: request.source, candidates });

  const answer = await ask({
    feature: 'duplicate-detection',
    model: JUDGE_MODEL,
    system: SYSTEM,
    prompt: [
      '## 새로 등록 신청된 도구',
      JSON.stringify(payload.source, null, 2),
      '',
      `## 이미 등록된 도구 ${payload.candidates.length}건`,
      JSON.stringify(payload.candidates, null, 2),
    ].join('\n'),
    schema: SCHEMA as unknown as Record<string, unknown>,
    validate: (value) => validate(value, new Set(candidates.map((entry) => entry.id))),
  });

  if (!answer) return null;

  const findings: DuplicateFinding[] = answer.value
    .map((entry) => ({
      candidateToolId: entry.candidateToolId as ToolId,
      verdict: entry.verdict,
      score: entry.score,
      overlapping: entry.overlapping,
      distinct: entry.distinct,
      recommendation: entry.recommendation,
      explanation: entry.explanation,
      lexicalOverlap: lexicalById.get(entry.candidateToolId) ?? 0,
    }))
    .sort((left, right) => right.score - left.score);

  return {
    toolVersionId: request.toolVersionId,
    toolId: request.source.id as ToolId,
    findings,
    // 후보를 추리기 전 전체를 봤다는 뜻이다. 모델이 본 것은 shortlist 지만,
    // 글자 겹침 계산은 pool 전체에 돌았다.
    comparedCount: pool.length,
    provenance: {
      model: answer.usage.model,
      generatedAt: new Date().toISOString(),
      humanReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
    },
  };
}

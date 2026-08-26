import type { RiskAnalysis, RiskFactorSuggestion } from '@/domain/analysis/types';
import type { ToolVersionId } from '@/domain/shared/ids';
import {
  RISK_FACTORS,
  getRiskFactor,
  type RiskFactorCode,
} from '@/domain/tool/risk-checklist-rules';
import { RISK_LEVELS, type RiskLevel } from '@/domain/tool/types';
import { JUDGE_MODEL, ask } from './client';
import { scrubDigest, type ToolDigest } from './redact';

/**
 * 위험도 자동 평가.
 *
 * ## 등급을 자동으로 확정하지 않는다
 *
 * 검토자가 쓰는 체크리스트와 **같은 14개 항목**에 대해 "해당된다/아니다"와
 * 그렇게 본 근거를 받는다. 화면에서는 그게 미리 체크된 상태로 뜨고, 검토자가
 * 항목마다 그대로 둘지 바꿀지 정한다. 저장되는 값은 검토자가 고른 값이다.
 *
 * 자동 확정하지 않는 이유는 규정이 아니라 실무다. 학사·연구 데이터의 민감도는
 * 등록 설명만 봐서는 알 수 없는 맥락에 달려 있고, 그 맥락을 아는 사람은
 * 검토자다. 모델은 놓치기 쉬운 항목을 짚어 주는 역할까지다.
 *
 * ## 근거를 강제하는 이유
 *
 * `evidence` 에 등록 내용의 대목을 그대로 옮기게 한다. 옮길 대목이 없으면
 * 그 항목은 해당되지 않는 것이다. 이 칸이 비면 검토자가 판단을 못 믿는다.
 */

function buildSystem(): string {
  const items = RISK_FACTORS.map(
    (factor) => `- ${factor.code} (${factor.label}): ${factor.question}`,
  ).join('\n');

  return `당신은 대학의 업무 자동화 도구가 어떤 위험을 안고 있는지 검토하는 사람을 돕습니다.

아래 14개 항목 각각에 대해, 등록된 도구 설명을 근거로 해당 여부를 판단하세요.

${items}

지켜야 할 것:
- evidence 에는 등록 내용에서 그렇게 판단한 **대목을 그대로 옮겨** 적습니다.
  옮길 대목이 없으면 그 항목은 applies=false 입니다. 추측으로 채우지 마세요.
- 설명에 없는 기능을 있다고 보지 마세요. 모르는 것은 해당 없음입니다.
- 14개 항목을 하나도 빠뜨리지 말고 모두 답하세요.

suggestedLevel 은 LOW / MEDIUM / HIGH / CRITICAL 중 하나입니다.
성적·상담·인사 기록, 연구보안 정보, 학생에게 불이익이 갈 수 있는 결정,
사람 확인 없는 비용 지출, 원본 파일 삭제·변경, 관리자 권한 사용 —
이 중 하나라도 해당되면 최소 HIGH 입니다.

summary 는 검토자가 읽습니다. 한국어로, 왜 그 등급인지 두세 문장으로 씁니다.`;
}

const SCHEMA = {
  type: 'object',
  properties: {
    suggestedLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    summary: { type: 'string' },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string', enum: RISK_FACTORS.map((factor) => factor.code) },
          applies: { type: 'boolean' },
          reason: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['code', 'applies', 'reason', 'evidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestedLevel', 'summary', 'suggestions'],
  additionalProperties: false,
} as const;

const VALID_CODES = new Set<string>(RISK_FACTORS.map((factor) => factor.code));
const VALID_LEVELS = new Set<string>(RISK_LEVELS);

interface RawRisk {
  suggestedLevel: RiskLevel;
  summary: string;
  suggestions: RiskFactorSuggestion[];
}

function validate(value: unknown): RawRisk | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;

  const suggestedLevel = String(row.suggestedLevel ?? '');
  if (!VALID_LEVELS.has(suggestedLevel)) return null;

  const raw = Array.isArray(row.suggestions) ? row.suggestions : [];
  const byCode = new Map<RiskFactorCode, RiskFactorSuggestion>();

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as Record<string, unknown>;
    const code = String(item.code ?? '');
    if (!VALID_CODES.has(code)) continue;

    const applies = Boolean(item.applies);
    const evidence = String(item.evidence ?? '').trim();

    byCode.set(code as RiskFactorCode, {
      code: code as RiskFactorCode,
      // 근거를 못 대면 해당 없음으로 내린다. 근거 없는 '해당됨'은 검토자의
      // 시간만 쓰게 한다.
      applies: applies && evidence.length > 0,
      reason: String(item.reason ?? '').trim(),
      evidence,
    });
  }

  // 빠뜨린 항목은 '해당 없음'으로 채운다. 화면의 체크리스트는 14줄이 다 있어야 한다.
  const suggestions = RISK_FACTORS.map(
    (factor) =>
      byCode.get(factor.code) ?? {
        code: factor.code,
        applies: false,
        reason: '판단할 근거를 찾지 못했습니다.',
        evidence: '',
      },
  );

  return {
    suggestedLevel: suggestedLevel as RiskLevel,
    summary: String(row.summary ?? '').trim(),
    suggestions,
  };
}

/**
 * 등급이 근거와 어긋나면 올린다.
 *
 * 모델이 CRITICAL 후보 항목을 해당된다고 해 놓고 등급은 MEDIUM 으로 내는 일이
 * 있다. 그러면 검토자에게 잘못된 안심을 준다. 근거 쪽을 믿고 등급을 올린다.
 * 내리는 방향으로는 손대지 않는다.
 */
function raiseLevelIfNeeded(
  suggestedLevel: RiskLevel,
  suggestions: readonly RiskFactorSuggestion[],
): RiskLevel {
  const criticalHits = suggestions.filter(
    (entry) => entry.applies && getRiskFactor(entry.code).criticalCandidate,
  ).length;

  if (criticalHits >= 2 && suggestedLevel !== 'CRITICAL') return 'CRITICAL';
  if (criticalHits >= 1 && (suggestedLevel === 'LOW' || suggestedLevel === 'MEDIUM')) return 'HIGH';
  return suggestedLevel;
}

export interface RiskAnalysisRequest {
  toolVersionId: ToolVersionId;
  tool: ToolDigest;
}

export async function analyzeRisk(request: RiskAnalysisRequest): Promise<RiskAnalysis | null> {
  const payload = scrubDigest(request.tool);

  const answer = await ask({
    feature: 'risk-assessment',
    model: JUDGE_MODEL,
    system: buildSystem(),
    prompt: ['## 검토할 도구', JSON.stringify(payload, null, 2)].join('\n'),
    schema: SCHEMA as unknown as Record<string, unknown>,
    validate,
  });

  if (!answer) return null;

  const suggestedLevel = raiseLevelIfNeeded(answer.value.suggestedLevel, answer.value.suggestions);

  return {
    toolVersionId: request.toolVersionId,
    suggestedLevel,
    summary: answer.value.summary,
    suggestions: answer.value.suggestions,
    // 통제 방안은 모델에게 묻지 않는다. 항목별로 이미 정해 둔 문구가 있고,
    // 그게 학교가 합의한 표현이다. 매번 새로 쓰게 하면 표현이 흔들린다.
    requiredControls: answer.value.suggestions
      .filter((entry) => entry.applies)
      .map((entry) => {
        const factor = getRiskFactor(entry.code);
        return {
          code: factor.code,
          description: factor.suggestedControl,
          mandatory: factor.criticalCandidate,
        };
      }),
    provenance: {
      model: answer.usage.model,
      generatedAt: new Date().toISOString(),
      humanReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
    },
  };
}

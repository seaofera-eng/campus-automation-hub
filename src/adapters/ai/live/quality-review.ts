import type {
  QualityFinding,
  QualityReview,
  QualityReviewKind,
  QualityReviewResult,
  QualitySeverity,
} from '@/domain/analysis/types';
import { aggregateQualityResults } from '@/domain/analysis/types';
import type { ToolVersionId } from '@/domain/shared/ids';
import { REVIEW_MODEL_A, REVIEW_MODEL_B, ask } from './client';
import { scrubDigest, type ToolDigest } from './redact';

/**
 * 멀티 LLM 품질검증.
 *
 * ## 관점마다 다른 모델
 *
 * 같은 모델에게 두 번 물으면 같은 각도에서 두 번 본다. 놓친 것은 두 번 다
 * 놓친다. 그래서 관점을 나누고 모델도 나눈다.
 *
 * - 일관성 → Opus. 여러 항목을 동시에 붙들고 서로 어긋나는 지점을 찾는 일이다.
 * - 규정·보안 → Sonnet. 목록을 짚어 나가는 일에 가깝고, 다른 모델이라는 점이
 *   교차 검증의 핵심이다.
 *
 * ## 자동으로 반려하지 않는다
 *
 * 판정이 갈리면 `NEEDS_HUMAN_REVIEW` 다. 둘 중 하나를 자동으로 편들지 않는다.
 * BLOCKER 가 있어도 화면에 "확인할 것이 있음"으로 뜰 뿐, 상태를 바꾸는 것은
 * 검토자다.
 */

const CONSISTENCY_SYSTEM = `당신은 대학의 업무 자동화 도구 등록 신청서를 읽고,
**신청서 안에서 앞뒤가 맞지 않는 곳**을 찾는 일을 합니다.

검토자는 하루에 수십 건을 훑습니다. 사람이 놓치기 쉬운 어긋남을 짚어 주세요.

이런 것을 찾습니다:
- 보안 항목에 "외부 전송 없음"이라고 했는데 기능 설명에는 외부 서비스를 쓴다고 적힌 경우
- 다루는 데이터에 개인정보가 없다고 했는데 입력 자료에 명단·연락처가 나오는 경우
- 자동화 수준이 "완전 자동"인데 설명에는 사람이 확인한다고 적힌 경우
- 실행 기록을 남긴다고 했는데 어디에 남기는지 전혀 없는 경우
- 해결하려는 문제와 주요 기능이 서로 다른 이야기를 하는 경우

지켜야 할 것:
- evidence 에는 신청서의 **어긋나는 두 대목을 모두** 옮겨 적으세요.
  한쪽만으로는 어긋났다고 할 수 없습니다.
- 신청서에 없는 내용을 근거로 삼지 마세요. 안 적혀 있는 것은 어긋난 것이 아니라
  빠진 것이고, 빠진 것은 NOTE 입니다.
- 찾은 것이 없으면 passed=true 에 빈 목록입니다. 억지로 채우지 마세요.

severity:
- BLOCKER: 그대로 두면 검토 판단이 틀어질 어긋남
- WARNING: 확인이 필요하지만 판단이 뒤집히지는 않을 것
- NOTE: 적어 두면 좋을 것

한국어로, 개발 용어 없이 씁니다. 검토자가 읽습니다.`;

const POLICY_SYSTEM = `당신은 대학의 업무 자동화 도구 등록 신청서를 읽고,
**규정과 보안 관점에서 빠진 것**을 찾는 일을 합니다.

대학이라는 점이 중요합니다. 학생의 성적·상담 기록, 연구보안 정보, 교직원 인사
정보가 오갑니다. 일반 기업과 기준이 다릅니다.

이런 것을 찾습니다:
- 개인정보를 다루는데 보관기간이나 파기 절차가 없는 경우
- 데이터를 외부로 보내는데 어디로 보내는지, 학습에 쓰이지 않는지가 없는 경우
- 학생에게 불이익이 갈 수 있는 판단을 하는데 사람 확인 단계가 없는 경우
- 관리자 권한으로 도는데 권한 범위가 적혀 있지 않은 경우
- 누가 언제 실행했는지 남지 않는 경우
- 저장 위치가 국외인데 그에 대한 언급이 없는 경우

지켜야 할 것:
- evidence 에는 신청서에서 그렇게 판단한 대목을 옮겨 적으세요.
  빠져 있다는 것이 근거라면 "무엇에 대한 언급이 없음"이라고 적습니다.
- 신청서에 있는 내용을 없다고 하지 마세요.
- 찾은 것이 없으면 passed=true 에 빈 목록입니다.

severity:
- BLOCKER: 이대로 승인하면 규정 위반이 될 수 있는 것
- WARNING: 승인 전에 보완을 요청할 것
- NOTE: 적어 두면 좋을 것

한국어로, 개발 용어 없이 씁니다. 검토자가 읽습니다.`;

const SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['BLOCKER', 'WARNING', 'NOTE'] },
          title: { type: 'string' },
          evidence: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['severity', 'title', 'evidence', 'suggestion'],
        additionalProperties: false,
      },
    },
  },
  required: ['passed', 'findings'],
  additionalProperties: false,
} as const;

const SEVERITIES = new Set<string>(['BLOCKER', 'WARNING', 'NOTE']);

function validate(value: unknown): { passed: boolean; findings: QualityFinding[] } | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;

  const findings: QualityFinding[] = [];
  for (const entry of Array.isArray(row.findings) ? row.findings : []) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as Record<string, unknown>;

    const severity = String(item.severity ?? '');
    if (!SEVERITIES.has(severity)) continue;

    const evidence = String(item.evidence ?? '').trim();
    const title = String(item.title ?? '').trim();
    // 근거도 제목도 없는 지적은 검토자의 시간만 쓴다.
    if (!title || !evidence) continue;

    findings.push({
      severity: severity as QualitySeverity,
      title,
      evidence,
      suggestion: String(item.suggestion ?? '').trim(),
    });
  }

  /*
   * 통과 여부는 모델이 스스로 매긴 `passed` 가 아니라 **심각도로 정한다.**
   *
   * 심각도를 세 단계로 나눠 놓고 판정에서 안 쓰면 나눈 의미가 없다. 참고(NOTE)
   * 한 줄만 있어도 탈락시키면 모든 도구가 탈락하고, 그러면 이 기능은 아무것도
   * 구분하지 못한다. 실제로 그랬다 — 첫 실행에서 6건이 전부 FAIL 이었다.
   *
   * NOTE 는 "적어 두면 좋을 것"이다. 승인을 막을 이유가 아니다.
   * 판정을 가르는 것은 BLOCKER 와 WARNING 이다.
   */
  const passed = !findings.some(
    (finding) => finding.severity === 'BLOCKER' || finding.severity === 'WARNING',
  );

  return { passed, findings };
}

async function runPerspective(
  kind: QualityReviewKind,
  model: string,
  system: string,
  digest: ToolDigest,
): Promise<QualityReviewResult | null> {
  const answer = await ask({
    feature: `quality-review:${kind}`,
    model,
    system,
    prompt: ['## 등록 신청서', JSON.stringify(digest, null, 2)].join('\n'),
    schema: SCHEMA as unknown as Record<string, unknown>,
    validate,
  });

  if (!answer) return null;

  return {
    kind,
    model: answer.usage.model,
    passed: answer.value.passed,
    findings: answer.value.findings,
  };
}

export interface QualityReviewRequest {
  toolVersionId: ToolVersionId;
  tool: ToolDigest;
}

/**
 * 두 관점을 나란히 돌린다.
 *
 * 한쪽이 실패해도 나머지 결과로 판정을 낸다. 다만 교차 검증이 안 된 결과는
 * 통과라도 사람 확인으로 돌린다 — 도메인의 `aggregateQualityResults` 가 한다.
 *
 * 둘 다 실패하면 `null`. 화면은 "아직 돌리지 않았습니다"로 나온다.
 */
export async function reviewQuality(
  request: QualityReviewRequest,
): Promise<QualityReview | null> {
  const digest = scrubDigest(request.tool);

  const [consistency, policy] = await Promise.all([
    runPerspective('CONSISTENCY', REVIEW_MODEL_A, CONSISTENCY_SYSTEM, digest),
    runPerspective('POLICY', REVIEW_MODEL_B, POLICY_SYSTEM, digest),
  ]);

  const results = [consistency, policy].filter((result): result is QualityReviewResult => result !== null);
  if (results.length === 0) return null;

  const { verdict, disagreement } = aggregateQualityResults(results);

  return {
    toolVersionId: request.toolVersionId,
    results,
    disagreement,
    verdict,
    provenance: {
      // 여러 모델이 봤으므로 하나를 적을 수 없다. 관점별 모델은 각 결과에 붙는다.
      model: results.map((result) => result.model).join(' + '),
      generatedAt: new Date().toISOString(),
      humanReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
    },
  };
}

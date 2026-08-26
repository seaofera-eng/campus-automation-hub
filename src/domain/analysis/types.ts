import type { RiskFactorCode } from '../tool/risk-checklist-rules';
import type { RiskLevel } from '../tool/types';
import type { DemandId, ToolId, ToolVersionId, UserId } from '../shared/ids';

/**
 * 모델이 낸 분석을 **저장해 둔 것**.
 *
 * ## 왜 저장하는가
 *
 * 세 가지 이유가 있고, 셋 다 중요하다.
 *
 * 1. **같은 질문에 같은 답.** 검토자가 화면을 새로 고칠 때마다 판단이 달라지면
 *    그건 검토 자료가 아니다.
 * 2. **비용.** 도구 하나를 열 때마다 모델을 부르면 감당이 안 된다.
 * 3. **끊겨도 돌아간다.** 키가 없거나 망이 막혀도 이미 나온 분석은 보인다.
 *
 * ## 언제 만들어지는가
 *
 * 등록 신청이 들어올 때 한 번. 그 뒤로는 새 버전이 올라올 때만 다시 돈다.
 *
 * ## 사람이 뒤집을 수 있다
 *
 * 모든 분석에는 사람이 확인했는지(`humanReviewed`)가 붙는다. 확인하지 않은
 * 분석은 화면에서 "아직 사람이 확인하지 않았습니다"로 표시한다.
 * 모델이 낸 등급이 그대로 확정되는 경로는 없다.
 */

/** 이 분석이 어디서 언제 나왔는지. 화면에 늘 같이 보여 준다. */
export interface AnalysisProvenance {
  /** 어떤 모델이 판단했는지. 화면에 그대로 적는다. */
  model: string;
  generatedAt: string;
  /** 사람이 내용을 확인했는가 */
  humanReviewed: boolean;
  reviewedBy: UserId | null;
  reviewedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* 중복 탐지                                                                    */
/* -------------------------------------------------------------------------- */

export type DuplicateVerdict = 'NEAR_IDENTICAL' | 'HIGH_OVERLAP' | 'RELATED' | 'INDEPENDENT';

export const DUPLICATE_VERDICT_LABELS: Record<DuplicateVerdict, string> = {
  NEAR_IDENTICAL: '사실상 같은 도구',
  HIGH_OVERLAP: '많이 겹침',
  RELATED: '관련 있음',
  INDEPENDENT: '겹치지 않음',
};

/**
 * 겹칠 때 무엇을 하라는 제안.
 *
 * 중복을 찾아 놓고 "중복입니다"에서 끝나면 검토자가 할 일이 늘기만 한다.
 * 어떻게 처리하라는 데까지 가야 쓸모가 있다.
 */
export type DuplicateRecommendation =
  /** 새로 만들 필요가 없다. 기존 도구를 쓰면 된다. */
  | 'USE_EXISTING'
  /** 기존 도구에 기능을 더해 하나로 합친다. */
  | 'MERGE_INTO_EXISTING'
  /** 둘 다 두되 어느 쪽을 언제 쓰는지 구분을 적어 둔다. */
  | 'DIFFERENTIATE'
  /** 겹치지 않는다. 그대로 진행. */
  | 'PROCEED';

export const DUPLICATE_RECOMMENDATION_LABELS: Record<DuplicateRecommendation, string> = {
  USE_EXISTING: '기존 도구로 충분함',
  MERGE_INTO_EXISTING: '기존 도구에 합치기',
  DIFFERENTIATE: '역할을 나눠 둘 다 두기',
  PROCEED: '그대로 진행',
};

export interface DuplicateFinding {
  candidateToolId: ToolId;
  verdict: DuplicateVerdict;
  /** 0~100. 모델이 매긴 겹침 정도. */
  score: number;
  /** 어디가 겹치는지 — 검토자가 근거를 눈으로 확인할 수 있게 */
  overlapping: string[];
  /** 어디가 다른지. 다른 점을 대지 못하면 사실상 같은 도구다. */
  distinct: string[];
  recommendation: DuplicateRecommendation;
  /** 검토자가 읽을 설명 한 문단 */
  explanation: string;
  /**
   * 후보를 추릴 때 나온 글자 겹침(0~100).
   *
   * 모델 판단과 나란히 두면 "글자는 비슷한데 하는 일은 다르다" 같은 경우가
   * 눈에 보인다. 이 값 자체는 중복도가 아니다.
   */
  lexicalOverlap: number;
}

export interface DuplicateAnalysis {
  toolVersionId: ToolVersionId;
  toolId: ToolId;
  /** 겹치는 순으로 정렬. 겹치는 것이 없으면 빈 배열이고, 그것도 결과다. */
  findings: DuplicateFinding[];
  /** 몇 개 도구와 비교했는지. "3개만 보고 판단했다"는 오해를 막는다. */
  comparedCount: number;
  provenance: AnalysisProvenance;
}

/* -------------------------------------------------------------------------- */
/* 위험도 자동 평가                                                             */
/* -------------------------------------------------------------------------- */

/**
 * 체크리스트 한 줄에 대한 모델의 의견.
 *
 * 검토자가 쓰는 항목(`RiskFactorCode`)과 **같은 코드**를 쓴다. 그래야 나란히
 * 놓고 "모델은 해당된다고 봤는데 나는 아니라고 본다"를 볼 수 있다.
 */
export interface RiskFactorSuggestion {
  code: RiskFactorCode;
  applies: boolean;
  /** 왜 그렇게 봤는지 */
  reason: string;
  /** 등록 내용 중 근거로 삼은 대목. 지어내지 못하게 붙인다. */
  evidence: string;
}

export interface RiskAnalysis {
  toolVersionId: ToolVersionId;
  /** 모델이 제안한 등급. 확정값이 아니다. */
  suggestedLevel: RiskLevel;
  /** 왜 그 등급인지 한 문단 */
  summary: string;
  suggestions: RiskFactorSuggestion[];
  /** 해당된 항목에 대해 권하는 통제 */
  requiredControls: { code: RiskFactorCode; description: string; mandatory: boolean }[];
  provenance: AnalysisProvenance;
}

/**
 * 모델 제안과 검토자 판단이 갈린 항목을 찾는다.
 *
 * 이 목록이 비어 있지 않다는 건 나쁜 신호가 아니라 **검토가 실제로 일어났다는
 * 증거**다. 화면에서 감추지 않고 보여 준다.
 */
export function findRiskDisagreements(
  analysis: Pick<RiskAnalysis, 'suggestions'>,
  items: readonly { code: RiskFactorCode; applies: boolean }[],
): { code: RiskFactorCode; suggested: boolean; decided: boolean }[] {
  return items.flatMap((item) => {
    const suggestion = analysis.suggestions.find((entry) => entry.code === item.code);
    if (!suggestion || suggestion.applies === item.applies) return [];
    return [{ code: item.code, suggested: suggestion.applies, decided: item.applies }];
  });
}

/* -------------------------------------------------------------------------- */
/* 수요 ↔ 도구 매칭                                                             */
/* -------------------------------------------------------------------------- */

/** 이미 있는 도구로 되는가, 아니면 만들어야 하는가. */
export type DemandMatchOutcome =
  /** 그대로 쓰면 된다 */
  | 'COVERED'
  /** 기존 도구를 조금 손보면 된다 */
  | 'PARTIAL'
  /** 새로 만들어야 한다 */
  | 'NOT_COVERED';

export const DEMAND_MATCH_OUTCOME_LABELS: Record<DemandMatchOutcome, string> = {
  COVERED: '기존 도구로 됩니다',
  PARTIAL: '조금 고치면 됩니다',
  NOT_COVERED: '새로 만들어야 합니다',
};

export interface DemandMatchFinding {
  toolId: ToolId;
  /** 0~100 */
  score: number;
  /** 요청한 기능 중 이 도구가 이미 하는 것 */
  coveredFeatures: string[];
  /** 이 도구가 못 하는 것. 개발 범위가 여기서 나온다. */
  missingFeatures: string[];
  explanation: string;
}

export interface DemandAnalysis {
  demandId: DemandId;
  outcome: DemandMatchOutcome;
  findings: DemandMatchFinding[];
  comparedCount: number;
  provenance: AnalysisProvenance;
}

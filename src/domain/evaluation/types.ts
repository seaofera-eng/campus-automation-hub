import type { CampusId, EvaluationId, ToolId, ToolVersionId, UserId } from '../shared/ids';

/**
 * 도구 사용자 평가 (요구사항 9번).
 *
 * 종합 만족도 하나만 점수로 받고, 아쉬운 점은 글로 받는다 (리뷰 7절).
 * 예전에는 7개 항목을 각각 1~5점으로 받았는데, 다 채우는 부담이 커서
 * 평가 자체를 안 하게 된다. 점수 하나와 한 문장이 안 쓰인 일곱 점수보다 낫다.
 *
 * **평가는 익명이다.** 누가 썼는지 화면에 보이지 않는다.
 * 개발자와 수요자가 서로 아는 사이인 학내 플랫폼에서 실명 평가는
 * 솔직한 이야기를 막는다. 감사 로그에도 점수와 내용은 남기지 않는다.
 */

export const EVALUATION_CRITERIA = ['overall'] as const;

export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];

export const EVALUATION_CRITERION_LABELS: Record<EvaluationCriterion, string> = {
  overall: '종합 만족도',
};

export const EVALUATION_CRITERION_HELP: Record<EvaluationCriterion, string> = {
  overall: '이 도구, 전체적으로 어땠습니까?',
};

export const MIN_SCORE = 1;
export const MAX_SCORE = 5;

export const SCORE_LABELS: Record<number, string> = {
  1: '매우 미흡',
  2: '미흡',
  3: '보통',
  4: '우수',
  5: '매우 우수',
};

export type EvaluationScores = Record<EvaluationCriterion, number>;

export interface ToolEvaluation {
  id: EvaluationId;
  campusId: CampusId;
  toolId: ToolId;
  /** 평가는 버전에 붙는다. 새 버전이 나오면 다시 평가할 수 있다. */
  toolVersionId: ToolVersionId;
  /**
   * 누가 썼는지. **화면에는 보여주지 않는다.**
   * 같은 사람이 같은 버전을 두 번 평가하지 못하게 막고, 본인이 자기 평가를
   * 고칠 수 있게 하려면 저장은 해야 한다. 표시하지 않을 뿐이다.
   */
  evaluatorUserId: UserId;
  scores: EvaluationScores;
  /** 종합 점수 옆에 적는 한 마디. 아쉬웠던 점을 주로 받는다. */
  comment: string;
  /** 몇 번 수정되었는가 */
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface EvaluationHistoryEntry {
  id: string;
  evaluationId: EvaluationId;
  /** 수정 직전의 값 */
  previousScores: EvaluationScores;
  previousComment: string;
  changedBy: UserId;
  changedAt: string;
}

export interface EvaluationSummary {
  count: number;
  /** 항목별 평균. 평가가 없으면 null. */
  averages: Record<EvaluationCriterion, number> | null;
  averageOverall: number | null;
  /** 종합 만족도 점수 분포 (1~5점 각각의 개수) */
  overallDistribution: Record<number, number>;
}

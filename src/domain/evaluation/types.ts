import type { CampusId, EvaluationId, ToolId, ToolVersionId, UserId } from '../shared/ids';

/**
 * 도구 사용자 평가 (요구사항 9번).
 * 7개 항목을 각각 1~5점으로 받는다.
 */

export const EVALUATION_CRITERIA = [
  'problemSolving',
  'workEfficiency',
  'usability',
  'stability',
  'accuracy',
  'spreadPotential',
  'overall',
] as const;

export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];

export const EVALUATION_CRITERION_LABELS: Record<EvaluationCriterion, string> = {
  problemSolving: '문제 해결력',
  workEfficiency: '업무 효율',
  usability: '사용 편의성',
  stability: '안정성',
  accuracy: '결과 정확성',
  spreadPotential: '다른 부서 확산 가능성',
  overall: '종합 만족도',
};

export const EVALUATION_CRITERION_HELP: Record<EvaluationCriterion, string> = {
  problemSolving: '원래 겪던 업무 문제가 실제로 해결되었습니까?',
  workEfficiency: '이 도구를 쓴 뒤 업무 처리 시간이 줄었습니까?',
  usability: '설명 없이도 쓸 수 있을 만큼 사용하기 쉬웠습니까?',
  stability: '오류 없이 안정적으로 동작했습니까?',
  accuracy: '결과물의 내용이 정확했습니까?',
  spreadPotential: '다른 부서에도 권할 만합니까?',
  overall: '전체적으로 만족스러웠습니까?',
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
  evaluatorUserId: UserId;
  scores: EvaluationScores;
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

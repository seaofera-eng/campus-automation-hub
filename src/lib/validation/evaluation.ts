import { z } from 'zod';
import { EVALUATION_CRITERIA, MAX_SCORE, MIN_SCORE } from '@/domain/evaluation/types';
import { EVALUATION_CRITERION_LABELS } from '@/domain/evaluation/types';
import { optionalText } from './common';

/**
 * 도구 평가 폼 검증 (요구사항 9번).
 *
 * 7개 항목 모두 1~5점 정수여야 한다. 도메인의 `assertValidScores()` 가
 * 같은 규칙을 서버에서 다시 확인한다 — 여기 검증은 폼에 어느 칸이 문제인지
 * 표시하기 위한 것이다.
 */

const score = z
  .number({ message: '점수를 선택해 주세요.' })
  .int(`${MIN_SCORE}점에서 ${MAX_SCORE}점 사이의 정수를 선택해 주세요.`)
  .min(MIN_SCORE, `${MIN_SCORE}점에서 ${MAX_SCORE}점 사이만 입력할 수 있습니다.`)
  .max(MAX_SCORE, `${MIN_SCORE}점에서 ${MAX_SCORE}점 사이만 입력할 수 있습니다.`);

const scoresShape = Object.fromEntries(
  EVALUATION_CRITERIA.map((criterion) => [
    criterion,
    score.describe(EVALUATION_CRITERION_LABELS[criterion]),
  ]),
) as Record<(typeof EVALUATION_CRITERIA)[number], typeof score>;

export const evaluationScoresSchema = z.object(scoresShape);

export const submitEvaluationSchema = z.object({
  toolId: z.string().min(1),
  scores: evaluationScoresSchema,
  comment: optionalText.pipe(
    z.string().max(2000, '의견은 2000자까지 입력할 수 있습니다.'),
  ),
});

export const updateEvaluationSchema = z.object({
  evaluationId: z.string().min(1),
  scores: evaluationScoresSchema,
  comment: optionalText.pipe(
    z.string().max(2000, '의견은 2000자까지 입력할 수 있습니다.'),
  ),
});

export type EvaluationFormInput = z.output<typeof submitEvaluationSchema>;

import { z } from 'zod';
import { WORK_FREQUENCIES } from '@/domain/demand/types';
import {
  CONSTRAINT_OPTIONS,
  INPUT_KINDS,
  OUTPUT_KINDS,
  TASK_KINDS,
} from '@/domain/wizard';

/**
 * 맞춤 AI 찾기 마법사 답 검증.
 *
 * 값을 **선택지 목록과 대조해서** 받는다. 화면이 보내는 값이지만 서버 액션은
 * 화면을 믿지 않는다. 모르는 값이 섞이면 문장을 만들 때 조용히 빠져서
 * "왜 내가 고른 게 안 들어갔지"가 된다. 여기서 미리 막는다.
 */

const TASK_VALUES = TASK_KINDS.map((option) => option.value) as [string, ...string[]];
const INPUT_VALUES = INPUT_KINDS.map((option) => option.value) as [string, ...string[]];
const OUTPUT_VALUES = OUTPUT_KINDS.map((option) => option.value) as [string, ...string[]];
const CONSTRAINT_VALUES = CONSTRAINT_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

/** 여러 개 고르는 칸. 중복은 조용히 지운다 — 사용자가 두 번 눌렀을 뿐이다. */
function uniqueList(values: [string, ...string[]], label: string, min: number) {
  return z
    .array(z.enum(values))
    .transform((list) => [...new Set(list)])
    .refine((list) => list.length >= min, {
      message: `${label} 한 가지 이상 골라 주세요.`,
    });
}

export const wizardAnswersSchema = z.object({
  taskKind: z.enum(TASK_VALUES, { message: '하고 싶은 일을 골라 주세요.' }),
  inputKinds: uniqueList(INPUT_VALUES, '사용하는 자료를', 1),
  outputKinds: uniqueList(OUTPUT_VALUES, '필요한 결과를', 1),
  frequency: z.enum(WORK_FREQUENCIES),
  // 조건은 없어도 된다. 억지로 고르게 하면 아무거나 누른다.
  constraints: uniqueList(CONSTRAINT_VALUES, '조건을', 0),
  extraNote: z
    .string()
    .trim()
    .max(1000, '직접 적는 내용은 1000자까지 쓸 수 있습니다.')
    .default(''),
});

export type WizardAnswersInput = z.output<typeof wizardAnswersSchema>;

/** 도구 추천과 초안 작성 모두 답 한 벌만 받는다. */
export const wizardRequestSchema = z.object({
  answers: wizardAnswersSchema,
});

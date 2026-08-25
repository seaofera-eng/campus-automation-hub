import { z } from 'zod';
import { requiredText } from './common';

/** 토큰 수여 (리뷰 6.4절) */
export const awardTokensSchema = z.object({
  demandId: z.string().min(1),
  toolId: z.string().min(1, '토큰을 줄 도구를 골라 주세요.'),
  /** 왜 이 도구를 골랐는지. 받는 사람이 보는 문장이다. */
  note: requiredText('한 마디', 5, 500),
});

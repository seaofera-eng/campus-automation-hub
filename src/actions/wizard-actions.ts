'use server';

import {
  buildDemandDraft,
  suggestTools,
  type WizardDraftResult,
  type WizardSuggestion,
} from '@/application/wizard/suggest';
import { run, type ActionResult } from '@/lib/actions/result';
import { parseOrThrow } from '@/lib/validation/common';
import { wizardRequestSchema } from '@/lib/validation/wizard';

/**
 * 맞춤 AI 찾기 마법사 (리뷰 2026-08-26 2절).
 *
 * ## 감사 로그를 남기지 않는다
 *
 * 둘 다 **읽기만** 한다. 아직 아무것도 만들어지지 않았고, 저장되는 것도 없다.
 * 실제 수요 등록은 확인 화면에서 기존 `saveDemandDraftAction` 이 하고,
 * 감사 로그는 거기서 남는다.
 *
 * 마법사를 중간에 그만두는 사람이 훨씬 많다. 그때마다 로그를 남기면
 * 정작 봐야 할 등록·승인 기록이 묻힌다.
 */

/** 고른 내용과 비슷한 도구를 찾는다. 모델을 부르지 않아 즉시 돌아온다. */
export async function suggestToolsAction(input: unknown): Promise<ActionResult<WizardSuggestion>> {
  return run(async () => {
    const data = parseOrThrow(wizardRequestSchema, input);
    return suggestTools(data.answers);
  });
}

/**
 * 수요 초안을 만든다.
 *
 * 모델이 붙어 있으면 문장을 다듬고, 없거나 실패하면 규칙으로 조립한 초안을
 * 그대로 돌려준다. **어느 쪽인지 결과에 담아 보낸다** — 화면이 "AI 가
 * 정리했습니다"와 "고르신 내용으로 정리했습니다"를 구분해서 써야 한다.
 */
export async function draftDemandAction(input: unknown): Promise<ActionResult<WizardDraftResult>> {
  return run(async () => {
    const data = parseOrThrow(wizardRequestSchema, input);
    return buildDemandDraft(data.answers);
  });
}

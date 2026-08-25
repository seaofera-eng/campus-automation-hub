'use server';

import { revalidatePath } from 'next/cache';
import { awardTokens } from '@/application/rewards/tokens';
import { withAudit } from '@/application/shared/audit';
import { run, type ActionResult } from '@/lib/actions/result';
import { requireUser } from '@/lib/auth/current-user';
import { parseOrThrow } from '@/lib/validation/common';
import { awardTokensSchema } from '@/lib/validation/reward';

/**
 * 토큰 수여 (리뷰 6.4절).
 *
 * 남에게 값이 오가는 일이라 감사 로그에 남긴다. 다만 수여 사유 본문은 넣지 않는다 —
 * 사람에 대한 판단이 섞일 수 있는 글이라 "누가 어느 수요에서 줬는지"만 남긴다.
 */
export async function awardTokensAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(awardTokensSchema, input);

    await withAudit(
      actor,
      {
        action: 'reward.award',
        targetType: 'demand',
        targetId: data.demandId,
        changedFields: ['rewardEntry'],
        summary: '수요를 해결한 도구에 토큰을 수여했습니다.',
      },
      () => awardTokens(actor, data),
    );

    revalidatePath(`/demands/${data.demandId}`);
    revalidatePath('/home');
    return null;
  });
}

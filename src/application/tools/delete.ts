import 'server-only';
import { hasAdminPermission } from '@/domain/authz/accounts';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { ToolId } from '@/domain/shared/ids';
import { ownerDeleteBlockReason } from '@/domain/tool/deletion';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 도구 삭제 (리뷰 2026-08-30).
 *
 * 실제로 줄을 지우지 않고 `deletedAt` 만 채운다. 이유는
 * `domain/tool/deletion.ts` 주석에 적어 두었다.
 *
 * ## 두 번 판단한다
 *
 * 1. **자격** — 내가 만든 것인가, 아니면 도구 관리 권한이 있는가 (`assertCan`)
 * 2. **상태** — 지금 지워도 되는 상태인가 (`ownerDeleteBlockReason`)
 *
 * 둘은 다른 질문이다. 만든 사람이 맞아도 검토가 시작됐으면 지울 수 없다.
 * 화면에서 버튼을 감췄는지와 무관하게 여기서 다시 판단한다.
 */
export async function deleteTool(actor: Profile, toolId: string): Promise<void> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  assertCan(toActor(actor), 'tool:delete', {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
  });

  /*
   * 상태 제한은 만든 사람에게만 적용한다.
   *
   * 도구 관리 권한자는 잘못 올라온 것을 치우는 것이 업무다. 여기서 막으면
   * 이미 승인된 도구를 정리할 길이 아예 없어진다 — '폐기'는 상태를 바꿀 뿐
   * 목록에서 치우지는 못한다.
   */
  const isOperator = hasAdminPermission(actor.accountType, actor.adminPermissions, 'MANAGE_TOOLS');
  if (!isOperator) {
    const blocked = ownerDeleteBlockReason(tool.status);
    if (blocked) throw conflict(blocked);
  }

  await repositories.tools.updateTool({
    ...tool,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

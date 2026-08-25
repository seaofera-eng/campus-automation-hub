import 'server-only';
import type { Profile } from '@/domain/identity/types';
import { newId } from '@/domain/shared/ids';
import type { ToolId } from '@/domain/shared/ids';
import { getRepositories } from '@/lib/di/container';

/**
 * 도구 사용 현황 기록.
 *
 * 대시보드와 상세 화면의 "조회 / 실행" 숫자를 만든다.
 *
 * 기록에 실패해도 화면은 정상 동작해야 한다. 통계를 남기지 못한 것이
 * 도구를 못 보는 이유가 되어서는 안 되므로 예외를 삼키고 서버 로그만 남긴다.
 */
export async function recordToolView(actor: Profile, toolId: ToolId): Promise<void> {
  await record(actor, toolId, 'VIEW');
}

export async function recordToolLaunch(actor: Profile, toolId: ToolId): Promise<void> {
  await record(actor, toolId, 'LAUNCH');
}

async function record(
  actor: Profile,
  toolId: ToolId,
  eventType: 'VIEW' | 'LAUNCH',
): Promise<void> {
  try {
    await getRepositories().observability.insertUsageEvent({
      id: newId<string>(),
      campusId: actor.campusId,
      toolId,
      userId: actor.id,
      eventType,
      occurredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[usage] 사용 이벤트 기록 실패:', eventType, error);
  }
}

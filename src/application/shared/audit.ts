import 'server-only';
import { headers } from 'next/headers';
import type { Profile } from '@/domain/identity/types';
import type { AuditLog } from '@/domain/observability/types';
import { newId } from '@/domain/shared/ids';
import type { AuditLogId } from '@/domain/shared/ids';
import { getRepositories } from '@/lib/di/container';

/**
 * 감사 로그 (요구사항 18번).
 *
 * 주요 조회·등록·수정·상태변경을 남긴다. **관리자 작업도 예외 없이 기록한다.**
 * 실패한 시도도 남긴다 — 권한이 없는 사람이 무엇을 시도했는지가 오히려 더 중요하다.
 *
 * 저장하는 것과 저장하지 않는 것을 분명히 나눈다.
 *  - 남긴다: 누가 · 언제 · 무엇을 · 어떤 필드를 바꿨는지 · 성공 여부 · IP/UA
 *  - 남기지 않는다: 바뀐 **값** 자체. 개인정보나 상담 내용이 로그로 새어 나가면 안 된다.
 */

export interface AuditContext {
  action: string;
  targetType: string;
  targetId?: string | null;
  /** 값이 아니라 필드 **이름**만. */
  changedFields?: string[];
  /** 화면에 표시할 짧은 요약. 개인정보를 넣지 않는다. */
  summary?: string;
}

async function requestMetadata(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const headerList = await headers();
    // 프록시 뒤에 있을 수 있으므로 x-forwarded-for 의 첫 항목을 쓴다.
    const forwarded = headerList.get('x-forwarded-for');
    const ipAddress = forwarded ? (forwarded.split(',')[0]?.trim() ?? null) : null;
    return { ipAddress, userAgent: headerList.get('user-agent') };
  } catch {
    // 요청 컨텍스트 밖(테스트 등)에서는 메타데이터 없이 기록한다.
    return { ipAddress: null, userAgent: null };
  }
}

async function write(
  actor: Profile,
  context: AuditContext,
  outcome: 'SUCCESS' | 'FAILURE',
  summary: string,
): Promise<void> {
  const { ipAddress, userAgent } = await requestMetadata();

  const log: AuditLog = {
    id: newId<AuditLogId>(),
    campusId: actor.campusId,
    action: context.action,
    actorUserId: actor.id,
    actorRole: actor.role,
    targetType: context.targetType,
    targetId: context.targetId ?? null,
    outcome,
    summary,
    changedFields: context.changedFields ?? [],
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
  };

  try {
    await getRepositories().observability.insertAuditLog(log);
  } catch (error) {
    // 감사 로그 실패가 본 작업을 되돌리게 하지는 않는다. 대신 반드시 서버 로그에 남긴다.
    console.error('[audit] 감사 로그 기록 실패:', context.action, error);
  }
}

/**
 * 작업을 감싸 성공·실패를 모두 감사 로그에 남긴다.
 * 예외는 그대로 다시 던지므로 상위의 오류 처리는 달라지지 않는다.
 */
export async function withAudit<T>(
  actor: Profile,
  context: AuditContext,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    const result = await operation();
    await write(actor, context, 'SUCCESS', context.summary ?? '');
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : '알 수 없는 오류';
    await write(actor, context, 'FAILURE', reason);
    throw error;
  }
}

/** 두 객체를 비교해 바뀐 **필드 이름만** 뽑는다. 값은 절대 담지 않는다. */
export function changedFieldNames<T extends Record<string, unknown>>(
  before: T,
  after: T,
): string[] {
  const names: string[] = [];
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      names.push(key);
    }
  }
  return names;
}

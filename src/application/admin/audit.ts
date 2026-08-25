import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import type { AuditLog } from '@/domain/observability/types';
import { asId } from '@/domain/shared/ids';
import type { UserId } from '@/domain/shared/ids';
import type { Page } from '@/domain/shared/pagination';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import type { AuditQueryInput } from '@/lib/validation/admin';

/**
 * 감사 로그 조회 (요구사항 18번).
 *
 * 로그에는 값이 아니라 **바뀐 필드 이름**만 들어 있다. 개인정보가 로그로
 * 새어 나가지 않도록 기록 시점에 이미 걸러 둔 것이다.
 */

export interface AuditLogRow {
  log: AuditLog;
  actorName: string;
}

export interface AuditLogResult {
  actor: Profile;
  page: Page<AuditLogRow>;
  /** 필터 드롭다운용 */
  actors: { id: string; name: string }[];
  actionNames: string[];
  targetTypes: string[];
}

export async function listAuditLogs(query: AuditQueryInput): Promise<AuditLogResult> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'admin:auditLogs');

  const repositories = getRepositories();
  const [page, profiles] = await Promise.all([
    repositories.observability.listAuditLogs(
      {
        campusId: actor.campusId,
        action: query.action || undefined,
        actorUserId: query.actorUserId ? asId<UserId>(query.actorUserId) : undefined,
        targetType: query.targetType || undefined,
        from: query.from || undefined,
        to: query.to || undefined,
      },
      { page: query.page, pageSize: query.pageSize },
    ),
    repositories.identity.listProfiles(actor.campusId),
  ]);

  // 필터 후보는 전체 로그에서 뽑아야 한다. 현재 페이지에만 있는 값으로 만들면
  // 필터를 걸수록 후보가 줄어드는 이상한 화면이 된다.
  const all = await repositories.observability.listAuditLogs(
    { campusId: actor.campusId },
    { page: 1, pageSize: 100 },
  );

  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return {
    actor,
    page: {
      ...page,
      items: page.items.map((log) => ({
        log,
        actorName: log.actorUserId
          ? (personNames.get(log.actorUserId) ?? '알 수 없음')
          : '시스템',
      })),
    },
    actors: profiles.map((profile) => ({ id: profile.id as string, name: profile.name })),
    actionNames: [...new Set(all.items.map((log) => log.action))].sort(),
    targetTypes: [...new Set(all.items.map((log) => log.targetType))].sort(),
  };
}

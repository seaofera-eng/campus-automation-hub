import 'server-only';
import { can } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { availableImprovementTransitions } from '@/domain/improvement/status-machine';
import type { ImprovementTransitionRule } from '@/domain/improvement/status-machine';
import type {
  ImprovementRequest,
  ImprovementRequestHistoryEntry,
  ImprovementStatus,
} from '@/domain/improvement/types';
import { notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { ImprovementRequestId, ToolId } from '@/domain/shared/ids';
import type { Page } from '@/domain/shared/pagination';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import type { ImprovementQueryInput } from '@/lib/validation/improvement';

/** 개선 요청 조회. */

export interface ImprovementListEntry {
  request: ImprovementRequest;
  toolName: string;
  requesterName: string;
  assigneeName: string | null;
}

export interface ImprovementListResult {
  actor: Profile;
  page: Page<ImprovementListEntry>;
  statusCounts: Record<ImprovementStatus, number>;
  tools: { id: string; name: string }[];
}

export async function listImprovements(
  query: ImprovementQueryInput,
): Promise<ImprovementListResult> {
  const actor = await requireUser();
  const repositories = getRepositories();

  const [page, statusCounts, profiles, toolPage] = await Promise.all([
    repositories.improvements.list(
      {
        campusId: actor.campusId,
        keyword: query.keyword || undefined,
        statuses: query.statuses.length > 0 ? (query.statuses as ImprovementStatus[]) : undefined,
        toolId: query.toolId ? asId<ToolId>(query.toolId) : undefined,
        assigneeUserId: query.assignedToMe ? actor.id : undefined,
        requesterUserId: query.requestedByMe ? actor.id : undefined,
      },
      { page: query.page, pageSize: query.pageSize },
    ),
    repositories.improvements.countByStatus(actor.campusId),
    repositories.identity.listProfiles(actor.campusId),
    repositories.tools.listTools({ campusId: actor.campusId }, 'NAME', {
      page: 1,
      pageSize: 100,
    }),
  ]);

  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const toolNames = new Map(toolPage.items.map((tool) => [tool.id, tool.name]));

  return {
    actor,
    page: {
      ...page,
      items: page.items.map((request) => ({
        request,
        toolName: toolNames.get(request.toolId) ?? '알 수 없는 도구',
        requesterName: personNames.get(request.requesterUserId) ?? '알 수 없음',
        assigneeName: request.assignedDeveloperUserId
          ? (personNames.get(request.assignedDeveloperUserId) ?? null)
          : null,
      })),
    },
    statusCounts,
    tools: toolPage.items.map((tool) => ({ id: tool.id as string, name: tool.name })),
  };
}

/* -------------------------------------------------------------------------- */
/* 상세                                                                        */
/* -------------------------------------------------------------------------- */

export interface ImprovementDetail {
  actor: Profile;
  request: ImprovementRequest;
  toolName: string;
  toolId: string;
  requesterName: string;
  assigneeName: string | null;
  history: (ImprovementRequestHistoryEntry & { changedByName: string })[];
  transitions: ImprovementTransitionRule[];
  /** 배정 후보 개발자 */
  developers: { id: string; name: string }[];
  permissions: { canAssign: boolean };
}

export async function loadImprovementDetail(improvementId: string): Promise<ImprovementDetail> {
  const actor = await requireUser();
  const repositories = getRepositories();

  const request = await repositories.improvements.getById(
    asId<ImprovementRequestId>(improvementId),
  );
  if (!request || request.deletedAt !== null) throw notFound('개선 요청');

  const [tool, profiles, history] = await Promise.all([
    repositories.tools.getTool(request.toolId),
    repositories.identity.listProfiles(actor.campusId),
    repositories.improvements.listHistory(request.id),
  ]);

  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return {
    actor,
    request,
    toolName: tool?.name ?? '삭제된 도구',
    toolId: (tool?.id ?? '') as string,
    requesterName: personNames.get(request.requesterUserId) ?? '알 수 없음',
    assigneeName: request.assignedDeveloperUserId
      ? (personNames.get(request.assignedDeveloperUserId) ?? null)
      : null,
    history: history.map((entry) => ({
      ...entry,
      changedByName: personNames.get(entry.changedBy) ?? '알 수 없음',
    })),
    transitions: [
      ...availableImprovementTransitions(request.status, {
        actorRole: actor.role,
        isRequester: request.requesterUserId === actor.id,
        isAssignee: request.assignedDeveloperUserId === actor.id,
      }),
    ],
    developers: profiles
      .filter((profile) => profile.role === 'DEVELOPER' || profile.role === 'ADMIN')
      .map((profile) => ({ id: profile.id as string, name: profile.name })),
    permissions: {
      canAssign: can(toActor(actor), 'improvement:assign', {
        ownerId: tool?.ownerUserId ?? null,
        developerIds: tool?.developerUserIds ?? [],
      }),
    },
  };
}

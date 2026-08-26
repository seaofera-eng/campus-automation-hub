import 'server-only';
import { assertCan, can } from '@/domain/authz/policies';
import { availableDemandTransitions } from '@/domain/demand/status-machine';
import type { DemandTransitionRule } from '@/domain/demand/status-machine';
import type {
  AutomationDemand,
  DemandMatch,
  DemandParticipant,
  DemandStatus,
} from '@/domain/demand/types';
import type { Profile } from '@/domain/identity/types';
import { notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { DemandId } from '@/domain/shared/ids';
import type { Page } from '@/domain/shared/pagination';
import { MAX_PAGE_SIZE, paginate } from '@/domain/shared/pagination';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { hasAdminPermission } from '@/domain/authz/accounts';
import type { MemberType } from '@/domain/authz/accounts';
import { loadDemandAnalysis, type DemandAnalysisView } from '@/application/analysis/query';
import { getRepositories } from '@/lib/di/container';
import type { DemandQueryInput } from '@/lib/validation/demand';
import { formFromDemand } from './register';
import type { DemandFormInput } from '@/lib/validation/demand';

/**
 * 수요 조회.
 *
 * 임시저장(DRAFT)은 등록한 본인과 관리자만 본다. 도구와 같은 원칙이다.
 */

export interface DemandListEntry {
  demand: AutomationDemand;
  requesterName: string;
  requesterMemberType: MemberType;
  matchCount: number;
  participantCount: number;
}

export interface DemandListResult {
  actor: Profile;
  page: Page<DemandListEntry>;
}

function canSee(actor: Profile, demand: AutomationDemand): boolean {
  if (demand.status !== 'DRAFT') return true;
  if (demand.requesterUserId === actor.id) return true;
  return hasAdminPermission(actor.accountType, actor.adminPermissions, 'REVIEW');
}

export async function listDemands(query: DemandQueryInput): Promise<DemandListResult> {
  const actor = await requireUser();
  const repositories = getRepositories();


  // 공개 범위 필터링이 페이지 자르기보다 먼저 일어나야 총 건수가 맞는다.
  // 그래서 한 번에 넉넉히 읽고 애플리케이션에서 거른 뒤 자른다.
  const all = await repositories.demands.listDemands(
    {
      campusId: actor.campusId,
      keyword: query.keyword || undefined,
      statuses: query.statuses.length > 0 ? (query.statuses as DemandStatus[]) : undefined,
      requesterUserId: query.onlyMine ? actor.id : undefined,
    },
    { page: 1, pageSize: MAX_PAGE_SIZE },
  );

  const profiles = await repositories.identity.listProfiles(actor.campusId);
  const personNames = new Map(profiles.map((p) => [p.id, p.name]));
  const personTypes = new Map(profiles.map((p) => [p.id, p.memberType]));

  const visible = all.items.filter((demand) => canSee(actor, demand));
  const items = await Promise.all(
    visible.map(async (demand) => {
      const [matches, participants] = await Promise.all([
        repositories.demands.listMatches(demand.id),
        repositories.demands.listParticipants(demand.id),
      ]);
      return {
        demand,
        requesterName: personNames.get(demand.requesterUserId) ?? '알 수 없음',
        requesterMemberType: personTypes.get(demand.requesterUserId) ?? 'STAFF',
        matchCount: matches.length,
        participantCount: participants.length,
      } satisfies DemandListEntry;
    }),
  );

  return {
    actor,
    page: paginate(items, { page: query.page, pageSize: query.pageSize }),
  };
}

/* -------------------------------------------------------------------------- */
/* 상세                                                                        */
/* -------------------------------------------------------------------------- */

export interface DemandDetail {
  actor: Profile;
  demand: AutomationDemand;
  requesterName: string;
  requesterMemberType: MemberType;
  matches: (DemandMatch & { toolName: string; toolStatus: string; matchedByName: string })[];
  participants: (DemandParticipant & { userName: string })[];
  transitions: DemandTransitionRule[];
  /** 매칭 화면에서 고를 수 있는 도구 목록 */
  linkableTools: { id: string; name: string; summary: string }[];
  permissions: {
    canEdit: boolean;
    canMatch: boolean;
    canJoin: boolean;
    alreadyJoined: boolean;
  };
  /** 미리 돌려 둔 매칭 분석. 돌린 적이 없으면 null. */
  analysis: DemandAnalysisView | null;
}

export async function loadDemandDetail(demandId: string): Promise<DemandDetail> {
  const actor = await requireUser();
  const repositories = getRepositories();

  const demand = await repositories.demands.getDemand(asId<DemandId>(demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');
  // 볼 수 없는 수요는 "없는 것"으로 취급한다.
  if (!canSee(actor, demand)) throw notFound('수요');

  const [profiles, matches, participants, analysis] = await Promise.all([
    repositories.identity.listProfiles(actor.campusId),
    repositories.demands.listMatches(demand.id),
    repositories.demands.listParticipants(demand.id),
    // 저장된 분석을 읽기만 한다. 여기서 모델을 부르지 않는다.
    loadDemandAnalysis(demand.id, actor.campusId),
  ]);

  const personNames = new Map(profiles.map((p) => [p.id, p.name]));

  const canMatch = can(toActor(actor), 'demand:match');

  // 연결 후보는 매칭 권한이 있을 때만 읽는다. 필요 없는 조회를 하지 않는다.
  const linkableTools = canMatch ? await loadLinkableTools(actor, matches) : [];

  const matchDetails = await Promise.all(
    matches.map(async (match) => {
      const tool = await repositories.tools.getTool(match.toolId);
      return {
        ...match,
        toolName: tool?.name ?? '삭제된 도구',
        toolStatus: tool?.status ?? 'RETIRED',
        matchedByName: personNames.get(match.matchedBy) ?? '알 수 없음',
      };
    }),
  );

  return {
    actor,
    demand,
    requesterMemberType:
      profiles.find((p) => p.id === demand.requesterUserId)?.memberType ?? 'STAFF',
    requesterName: personNames.get(demand.requesterUserId) ?? '알 수 없음',
    matches: matchDetails,
    participants: participants.map((participant) => {
      return {
        ...participant,
        userName: personNames.get(participant.userId) ?? '알 수 없음',
      };
    }),
    transitions: [
      ...availableDemandTransitions(demand.status, {
        accountType: actor.accountType,
    adminPermissions: actor.adminPermissions,
        isRequester: demand.requesterUserId === actor.id,
      }),
    ],
    linkableTools,
    permissions: {
      canEdit:
        can(toActor(actor), 'demand:update', { ownerId: demand.requesterUserId }) &&
        (demand.status === 'DRAFT' || demand.status === 'OPEN'),
      canMatch,
      canJoin:
        can(toActor(actor), 'demand:participate') &&
        demand.status !== 'DRAFT' &&
        demand.status !== 'COMPLETED' &&
        demand.status !== 'CLOSED' &&
        !participants.some((participant) => participant.userId === actor.id),
      alreadyJoined: participants.some((participant) => participant.userId === actor.id),
    },
    analysis,
  };
}

async function loadLinkableTools(
  actor: Profile,
  existingMatches: readonly DemandMatch[],
): Promise<{ id: string; name: string; summary: string }[]> {
  const repositories = getRepositories();
  const linked = new Set(existingMatches.map((match) => match.toolId as string));

  // 이미 쓸 수 있는 도구만 후보로 보여준다. 임시저장이나 폐기된 도구를 연결할 이유가 없다.
  const page = await repositories.tools.listTools(
    { campusId: actor.campusId, statuses: ['PILOT', 'APPROVED'] },
    'NAME',
    { page: 1, pageSize: 100 },
  );

  return page.items
    .filter((tool) => !linked.has(tool.id as string))
    .map((tool) => ({ id: tool.id as string, name: tool.name, summary: tool.summary }));
}

/** 수정 화면의 초기값. */
export async function loadDemandForm(demandId: string): Promise<{
  actor: Profile;
  demand: { id: string; status: DemandStatus } | null;
  initialForm: DemandFormInput;
}> {
  const actor = await requireUser();
  const repositories = getRepositories();

  const demand = await repositories.demands.getDemand(asId<DemandId>(demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  assertCan(toActor(actor), 'demand:update', { ownerId: demand.requesterUserId });

  return {
    actor,
    demand: { id: demand.id, status: demand.status },
    initialForm: formFromDemand(demand),
  };
}

export async function loadNewDemandForm(): Promise<{
  actor: Profile;
}> {
  const actor = await requireUser();
  return { actor };
}

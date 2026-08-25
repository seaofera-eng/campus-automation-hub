import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { DemandMatch, DemandParticipant, MatchType, ParticipantRole } from '@/domain/demand/types';
import { MATCH_TYPE_LABELS } from '@/domain/demand/types';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { DemandId, DemandMatchId, ToolId } from '@/domain/shared/ids';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import { notifyMany } from '../shared/notify';
import { josa } from '@/domain/shared/josa';

/**
 * 수요-도구 수동 매칭과 개발 참여 (요구사항 8번).
 *
 * ⚠️ **자동 매칭이 아니다.** 사람이 도구를 찾아 고르고, 연결 유형 5종 중
 * 하나를 선택하고, 왜 그렇게 연결했는지 직접 적는다. 유사도 점수 같은 값을
 * 만들지 않는다. 자동 추천은 2단계 DemandMatchingService 의 몫이다.
 */

export interface LinkToolInput {
  demandId: string;
  toolId: string;
  matchType: MatchType;
  rationale: string;
}

export async function linkToolToDemand(
  actor: Profile,
  input: LinkToolInput,
): Promise<DemandMatch> {
  const repositories = getRepositories();

  // 요구사항 8번: 관리자 또는 검토자만 연결한다.
  assertCan(toActor(actor), 'demand:match');

  const demand = await repositories.demands.getDemand(asId<DemandId>(input.demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  const tool = await repositories.tools.getTool(asId<ToolId>(input.toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  const existing = await repositories.demands.listMatches(demand.id);
  if (existing.some((match) => match.toolId === tool.id)) {
    throw conflict(
      `'${tool.name}'${josa(tool.name, '은는')} 이미 이 수요에 연결되어 있습니다. 연결 유형을 바꾸려면 기존 연결을 해제한 뒤 다시 연결해 주세요.`,
    );
  }

  const match = await repositories.demands.insertMatch({
    id: newId<DemandMatchId>(),
    demandId: demand.id,
    toolId: tool.id,
    matchType: input.matchType,
    rationale: input.rationale,
    matchedBy: actor.id,
    matchedAt: new Date().toISOString(),
  });

  await notifyMany([demand.requesterUserId].filter((id) => id !== actor.id), {
    campusId: demand.campusId,
    kind: 'DEMAND_MATCHED',
    title: `수요 '${demand.title}'에 도구가 연결되었습니다`,
    body: `'${tool.name}' — ${MATCH_TYPE_LABELS[input.matchType]}`,
    linkPath: `/demands/${demand.id}`,
  });

  return match;
}

export async function unlinkToolFromDemand(
  actor: Profile,
  demandId: string,
  matchId: string,
): Promise<void> {
  const repositories = getRepositories();
  assertCan(toActor(actor), 'demand:match');

  const demand = await repositories.demands.getDemand(asId<DemandId>(demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  // 다른 수요의 연결 ID를 넣어도 지워지지 않도록 소속을 확인한다.
  const matches = await repositories.demands.listMatches(demand.id);
  if (!matches.some((match) => match.id === matchId)) throw notFound('연결');

  await repositories.demands.deleteMatch(matchId);
}

export interface JoinDemandInput {
  demandId: string;
  participantRole: ParticipantRole;
  message: string;
}

export async function joinDemand(
  actor: Profile,
  input: JoinDemandInput,
): Promise<DemandParticipant> {
  const repositories = getRepositories();

  // 개발 참여 신청은 개발자만 한다.
  assertCan(toActor(actor), 'demand:participate');

  const demand = await repositories.demands.getDemand(asId<DemandId>(input.demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  if (demand.status === 'DRAFT') {
    throw conflict('아직 공개되지 않은 수요입니다. 공개된 뒤에 참여를 신청할 수 있습니다.');
  }
  if (demand.status === 'COMPLETED' || demand.status === 'CLOSED') {
    throw conflict('이미 종료된 수요에는 참여를 신청할 수 없습니다.');
  }

  const participants = await repositories.demands.listParticipants(demand.id);
  if (participants.some((participant) => participant.userId === actor.id)) {
    throw conflict('이미 이 수요에 참여를 신청하셨습니다.');
  }

  const participant = await repositories.demands.insertParticipant({
    id: newId<string>(),
    demandId: demand.id,
    userId: actor.id,
    participantRole: input.participantRole,
    message: input.message,
    joinedAt: new Date().toISOString(),
  });

  await notifyMany([demand.requesterUserId].filter((id) => id !== actor.id), {
    campusId: demand.campusId,
    kind: 'DEMAND_PARTICIPANT_JOINED',
    title: `수요 '${demand.title}'에 참여 신청이 들어왔습니다`,
    // 참여 메시지 원문은 담지 않는다. 상세에서 보게 한다.
    body: `${actor.name} 님이 참여를 신청했습니다.`,
    linkPath: `/demands/${demand.id}`,
  });

  return participant;
}

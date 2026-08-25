import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import { assertDemandTransitionAllowed } from '@/domain/demand/status-machine';
import type { AutomationDemand, DemandStatus } from '@/domain/demand/types';
import { DEMAND_STATUS_LABELS } from '@/domain/demand/types';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { DemandId, DepartmentId } from '@/domain/shared/ids';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import type { DemandFormInput } from '@/lib/validation/demand';
import { notifyMany } from '../shared/notify';

/**
 * 수요 등록 · 상태 전환 (요구사항 8번).
 *
 * 수요는 등록한 사람이 직접 공개하고 종료할 수 있다. 도구와 달리
 * 검토를 거치지 않는다 — 수요는 "이런 게 필요합니다"라는 요청이지
 * 승인 대상이 아니기 때문이다.
 */

export interface SaveDemandInput {
  demandId?: string;
  form: DemandFormInput;
}

export interface SaveDemandResult {
  demandId: DemandId;
  created: boolean;
}

function applyForm(
  base: AutomationDemand,
  form: DemandFormInput,
  now: string,
): AutomationDemand {
  return {
    ...base,
    title: form.title,
    departmentId: asId<DepartmentId>(form.departmentId || base.departmentId),
    currentWorkDescription: form.currentWorkDescription,
    mostPainfulStep: form.mostPainfulStep,
    inputMaterials: form.inputMaterials,
    desiredOutcome: form.desiredOutcome,
    systemsInUse: form.systemsInUse,
    workFrequency: form.workFrequency,
    expectedUserCount: form.expectedUserCount,
    containsPersonalData: form.containsPersonalData,
    containsAcademicOrResearchData: form.containsAcademicOrResearchData,
    requiresHumanApproval: form.requiresHumanApproval,
    requiredFeatures: form.requiredFeatures,
    optionalFeatures: form.optionalFeatures,
    expectedBenefit: form.expectedBenefit,
    desiredCompletionDate: form.desiredCompletionDate || null,
    updatedAt: now,
  };
}

export function formFromDemand(demand: AutomationDemand): DemandFormInput {
  return {
    title: demand.title,
    departmentId: demand.departmentId,
    currentWorkDescription: demand.currentWorkDescription,
    mostPainfulStep: demand.mostPainfulStep,
    inputMaterials: demand.inputMaterials,
    desiredOutcome: demand.desiredOutcome,
    systemsInUse: demand.systemsInUse,
    workFrequency: demand.workFrequency,
    expectedUserCount: demand.expectedUserCount,
    containsPersonalData: demand.containsPersonalData,
    containsAcademicOrResearchData: demand.containsAcademicOrResearchData,
    requiresHumanApproval: demand.requiresHumanApproval,
    requiredFeatures: demand.requiredFeatures,
    optionalFeatures: demand.optionalFeatures,
    expectedBenefit: demand.expectedBenefit,
    desiredCompletionDate: demand.desiredCompletionDate ?? '',
  };
}

export async function saveDemandDraft(
  actor: Profile,
  input: SaveDemandInput,
): Promise<SaveDemandResult> {
  const repositories = getRepositories();
  const now = new Date().toISOString();

  if (input.demandId) {
    const demand = await repositories.demands.getDemand(asId<DemandId>(input.demandId));
    if (!demand || demand.deletedAt !== null) throw notFound('수요');

    assertCan(toActor(actor), 'demand:update', { ownerId: demand.requesterUserId });

    // 이미 개발이 진행 중인 수요는 내용을 바꾸면 안 된다.
    // 개발자가 보고 착수한 내용과 달라지기 때문이다.
    if (demand.status !== 'DRAFT' && demand.status !== 'OPEN') {
      throw conflict(
        `'${DEMAND_STATUS_LABELS[demand.status]}' 상태의 수요는 내용을 수정할 수 없습니다. 바뀐 내용이 있으면 댓글이나 새 수요로 알려 주세요.`,
      );
    }

    await repositories.demands.updateDemand(applyForm(demand, input.form, now));
    return { demandId: demand.id, created: false };
  }

  assertCan(toActor(actor), 'demand:create');

  const demandId = newId<DemandId>();
  const demand: AutomationDemand = applyForm(
    {
      id: demandId,
      campusId: actor.campusId,
      title: input.form.title,
      // 부서를 고르지 않았으면 작성자 소속을 기본값으로 둔다.
      departmentId: asId<DepartmentId>(input.form.departmentId || (actor.departmentId ?? '')),
      requesterUserId: actor.id,
      currentWorkDescription: '',
      mostPainfulStep: '',
      inputMaterials: '',
      desiredOutcome: '',
      systemsInUse: '',
      workFrequency: 'MONTHLY',
      expectedUserCount: null,
      containsPersonalData: false,
      containsAcademicOrResearchData: false,
      requiresHumanApproval: true,
      requiredFeatures: [],
      optionalFeatures: [],
      expectedBenefit: '',
      desiredCompletionDate: null,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      deletedAt: null,
    },
    input.form,
    now,
  );

  await repositories.demands.insertDemand(demand);
  return { demandId, created: true };
}

export interface TransitionDemandInput {
  demandId: string;
  toStatus: DemandStatus;
  reason: string;
}

export async function transitionDemand(
  actor: Profile,
  input: TransitionDemandInput,
): Promise<DemandStatus> {
  const repositories = getRepositories();
  const demand = await repositories.demands.getDemand(asId<DemandId>(input.demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  assertCan(toActor(actor), 'demand:transition', { ownerId: demand.requesterUserId });

  // 상태머신이 최종 판단한다.
  assertDemandTransitionAllowed(demand.status, input.toStatus, {
    accountType: actor.accountType,
    adminPermissions: actor.adminPermissions,
    isRequester: demand.requesterUserId === actor.id,
  });

  await repositories.demands.updateDemand({
    ...demand,
    status: input.toStatus,
    updatedAt: new Date().toISOString(),
  });

  // 등록자가 아닌 사람이 상태를 바꿨으면 등록자에게 알린다.
  if (demand.requesterUserId !== actor.id) {
    await notifyMany([demand.requesterUserId], {
      campusId: demand.campusId,
      kind: 'DEMAND_MATCHED',
      title: `수요 '${demand.title}'의 상태가 ${DEMAND_STATUS_LABELS[input.toStatus]}(으)로 바뀌었습니다`,
      body: '수요 상세에서 확인해 주세요.',
      linkPath: `/demands/${demand.id}`,
    });
  }

  return input.toStatus;
}

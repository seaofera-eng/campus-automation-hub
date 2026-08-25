import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type {
  CategoryId,
  IntegrationSystemId,
  StatusHistoryId,
  ToolId,
  ToolVersionId,
} from '@/domain/shared/ids';
import { assertTransitionAllowed } from '@/domain/tool/status-machine';
import type { AutomationTool, AutomationToolVersion } from '@/domain/tool/types';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import type { ToolFormInput } from '@/lib/validation/tool';
import { emptyToolForm } from '@/lib/validation/tool';
import { changedFieldNames } from '../shared/audit';

/**
 * 도구 등록 · 임시저장 (요구사항 6번·7번).
 *
 * 도구는 항상 DRAFT 로 만들어지고, 상세 내용은 버전에 붙는다.
 * 등록 신청(SUBMITTED)은 상태머신을 통과해야 하며 이력이 남는다.
 */

export interface SaveDraftInput {
  toolId?: string;
  form: ToolFormInput;
}

export interface SaveDraftResult {
  toolId: ToolId;
  versionId: ToolVersionId;
  /** 이번 저장에서 새로 만들어졌는가 */
  created: boolean;
}

/* -------------------------------------------------------------------------- */
/* 폼 ↔ 도메인 변환                                                            */
/* -------------------------------------------------------------------------- */

function versionFromForm(
  base: Pick<AutomationToolVersion, 'id' | 'toolId' | 'campusId' | 'createdAt' | 'createdBy'>,
  form: ToolFormInput,
  now: string,
): AutomationToolVersion {
  return {
    ...base,
    versionLabel: form.versionLabel || 'v1.0',
    changeNote: form.changeNote,

    description: form.description,
    problemStatement: form.problemStatement,

    keyFeatures: form.keyFeatures,
    currentWorkflow: form.currentWorkflow,
    automatedWorkflow: form.automatedWorkflow,
    inputData: form.inputData,
    outputData: form.outputData,
    expectedUsers: form.expectedUsers,
    monthlyExpectedUsage: form.monthlyExpectedUsage,
    automationLevel: form.automationLevel,

    integrations: form.integrations.map((integration) => ({
      integrationSystemId: asId<IntegrationSystemId>(integration.integrationSystemId),
      note: integration.note,
    })),
    otherIntegrationNote: form.otherIntegrationNote,

    security: {
      classifications: form.classifications,
      sendsDataExternally: form.sendsDataExternally,
      externalTransferTargets: form.externalTransferTargets,
      dataStorageLocation: form.dataStorageLocation,
      dataRetentionPeriod: form.dataRetentionPeriod,
      hasExecutionLog: form.hasExecutionLog,
      requiresHumanApproval: form.requiresHumanApproval,
    },

    cost: {
      initialDevelopmentCost: form.initialDevelopmentCost,
      monthlyOperationCost: form.monthlyOperationCost,
      monthlyLlmCost: form.monthlyLlmCost,
      externalServiceCost: form.externalServiceCost,
      costPerUser: form.costPerUser,
      costBasis: form.costBasis,
    },

    performance: {
      currentProcessingMinutes: form.currentProcessingMinutes,
      automatedProcessingMinutes: form.automatedProcessingMinutes,
      monthlySavedHours: form.monthlySavedHours,
      errorReductionNote: form.errorReductionNote,
      expectedBenefit: form.expectedBenefit,
      measurementMethod: form.measurementMethod,
    },

    repositoryUrl: form.repositoryUrl,
    serviceUrl: form.serviceUrl,

    updatedAt: now,
    deletedAt: null,
  };
}

/** 저장된 도구·버전을 폼 값으로 되돌린다. 수정 화면에서 쓴다. */
export function formFromTool(
  tool: AutomationTool,
  version: AutomationToolVersion,
): ToolFormInput {
  const empty = emptyToolForm();

  // 데이터 분류는 8종 전부 있어야 체크박스가 그려진다. 저장된 값으로 덮어쓴다.
  const savedByClassification = new Map(
    version.security.classifications.map((entry) => [entry.classification, entry]),
  );
  const classifications = empty.classifications.map(
    (entry) => savedByClassification.get(entry.classification) ?? entry,
  );

  return {
    name: tool.name,
    summary: tool.summary,
    categoryId: tool.categoryId,
    runtimeKind: tool.runtimeKind,
    recommendedFor: tool.recommendedFor,
    tags: tool.tags,
    description: version.description,
    problemStatement: version.problemStatement,

    keyFeatures: version.keyFeatures,
    currentWorkflow: version.currentWorkflow,
    automatedWorkflow: version.automatedWorkflow,
    inputData: version.inputData,
    outputData: version.outputData,
    expectedUsers: version.expectedUsers,
    monthlyExpectedUsage: version.monthlyExpectedUsage,
    automationLevel: version.automationLevel,

    integrations: version.integrations.map((integration) => ({
      integrationSystemId: integration.integrationSystemId,
      note: integration.note,
    })),
    otherIntegrationNote: version.otherIntegrationNote,
    classifications,
    sendsDataExternally: version.security.sendsDataExternally,
    externalTransferTargets: version.security.externalTransferTargets,
    dataStorageLocation: version.security.dataStorageLocation,
    dataRetentionPeriod: version.security.dataRetentionPeriod,
    hasExecutionLog: version.security.hasExecutionLog,
    requiresHumanApproval: version.security.requiresHumanApproval,

    initialDevelopmentCost: version.cost.initialDevelopmentCost,
    monthlyOperationCost: version.cost.monthlyOperationCost,
    monthlyLlmCost: version.cost.monthlyLlmCost,
    externalServiceCost: version.cost.externalServiceCost,
    costPerUser: version.cost.costPerUser,
    costBasis: version.cost.costBasis,

    currentProcessingMinutes: version.performance.currentProcessingMinutes,
    automatedProcessingMinutes: version.performance.automatedProcessingMinutes,
    monthlySavedHours: version.performance.monthlySavedHours,
    errorReductionNote: version.performance.errorReductionNote,
    expectedBenefit: version.performance.expectedBenefit,
    measurementMethod: version.performance.measurementMethod,

    repositoryUrl: version.repositoryUrl,
    serviceUrl: version.serviceUrl,

    versionLabel: version.versionLabel,
    changeNote: version.changeNote,
  };
}

/* -------------------------------------------------------------------------- */
/* 임시저장                                                                     */
/* -------------------------------------------------------------------------- */

export async function saveDraft(actor: Profile, input: SaveDraftInput): Promise<SaveDraftResult> {
  const repositories = getRepositories();
  const now = new Date().toISOString();

  if (input.toolId) {
    return updateExistingDraft(actor, input.toolId as string, input.form, now);
  }

  assertCan(toActor(actor), 'tool:create');

  // 같은 이름이 이미 있으면 막는다. 중복 등록을 줄이는 것이 이 플랫폼의 목적 중 하나다.
  const duplicate = await repositories.tools.getToolByName(actor.campusId, input.form.name);
  if (duplicate) {
    throw conflict(
      `'${input.form.name}' 이름의 도구가 이미 등록되어 있습니다. 기존 도구를 확인하시고, 다른 도구라면 이름을 조금 다르게 지어 주세요.`,
    );
  }

  const toolId = newId<ToolId>();
  const versionId = newId<ToolVersionId>();

  const tool: AutomationTool = {
    id: toolId,
    campusId: actor.campusId,
    name: input.form.name,
    summary: input.form.summary,
    categoryId: asId<CategoryId>(input.form.categoryId),
    runtimeKind: input.form.runtimeKind,
    recommendedFor: input.form.recommendedFor,
    ownerUserId: actor.id,
    developerUserIds: [actor.id],
    status: 'DRAFT',
    currentVersionId: versionId,
    tags: input.form.tags,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    deletedAt: null,
  };

  const version = versionFromForm(
    {
      id: versionId,
      toolId,
      campusId: actor.campusId,
      createdAt: now,
      createdBy: actor.id,
    },
    input.form,
    now,
  );

  await repositories.tools.insertTool(tool);
  await repositories.tools.insertVersion(version);
  await repositories.tools.insertStatusHistory({
    id: newId<StatusHistoryId>(),
    toolId,
    fromStatus: null,
    toStatus: 'DRAFT',
    changedBy: actor.id,
    changedAt: now,
    reason: '도구를 새로 등록했습니다.',
    reviewComment: '',
  });

  return { toolId, versionId, created: true };
}

async function updateExistingDraft(
  actor: Profile,
  toolId: string,
  form: ToolFormInput,
  now: string,
): Promise<SaveDraftResult> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) {
    throw notFound('도구');
  }

  assertCan(toActor(actor), 'tool:update', {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
  });

  // 검토 중인 도구는 내용이 바뀌면 안 된다. 검토자가 본 것과 달라지기 때문이다.
  if (tool.status !== 'DRAFT' && tool.status !== 'REVISION_REQUIRED') {
    throw conflict(
      '검토가 시작된 뒤에는 내용을 바로 수정할 수 없습니다. 보완 요청을 받았거나 승인된 도구라면 새 버전을 만들어 수정해 주세요.',
    );
  }

  const version = await repositories.tools.getVersion(tool.currentVersionId);
  if (!version) {
    throw notFound('도구 버전');
  }

  const updatedTool: AutomationTool = {
    ...tool,
    name: form.name,
    summary: form.summary,
    categoryId: asId<CategoryId>(form.categoryId),
    tags: form.tags,
    updatedAt: now,
  };

  const updatedVersion = versionFromForm(
    {
      id: version.id,
      toolId: version.toolId,
      campusId: version.campusId,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
    },
    form,
    now,
  );

  await repositories.tools.updateTool(updatedTool);
  await repositories.tools.updateVersion(updatedVersion);

  return { toolId: tool.id, versionId: version.id, created: false };
}

/** 감사 로그에 남길 "바뀐 필드 이름" 목록. 값은 담지 않는다. */
export async function draftChangedFields(toolId: string, form: ToolFormInput): Promise<string[]> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool) return [];
  const version = await repositories.tools.getVersion(tool.currentVersionId);
  if (!version) return [];

  return changedFieldNames(
    formFromTool(tool, version) as unknown as Record<string, unknown>,
    form as unknown as Record<string, unknown>,
  );
}

/* -------------------------------------------------------------------------- */
/* 등록 신청                                                                    */
/* -------------------------------------------------------------------------- */

export interface SubmitToolInput {
  toolId: string;
  form: ToolFormInput;
  /** 재신청이라면 무엇을 보완했는지 */
  note?: string;
}

export async function submitTool(actor: Profile, input: SubmitToolInput): Promise<ToolId> {
  const repositories = getRepositories();
  const toolId = asId<ToolId>(input.toolId);

  // 신청 직전에 최신 내용을 한 번 더 저장한다.
  // 위저드 마지막 단계에서 고친 내용이 빠지지 않게 하기 위함이다.
  await updateExistingDraft(actor, input.toolId, input.form, new Date().toISOString());

  const tool = await repositories.tools.getTool(toolId);
  if (!tool) throw notFound('도구');

  assertCan(toActor(actor), 'tool:submit', {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
  });

  const isResubmission = tool.status === 'REVISION_REQUIRED';
  const reason = input.note?.trim()
    ? input.note.trim()
    : isResubmission
      ? '보완 요청 사항을 반영해 다시 신청합니다.'
      : '검토를 위해 등록을 신청합니다.';

  // 상태머신이 최종 판단한다. UI 에서 버튼을 감췄는지 여부와 무관하다.
  assertTransitionAllowed(tool.status, 'SUBMITTED', {
    accountType: actor.accountType,
    adminPermissions: actor.adminPermissions,
    isOwner: tool.ownerUserId === actor.id || tool.developerUserIds.includes(actor.id),
    riskLevel: null,
    hasRiskChecklist: false,
  });

  const now = new Date().toISOString();
  await repositories.tools.updateTool({ ...tool, status: 'SUBMITTED', updatedAt: now });
  await repositories.tools.insertStatusHistory({
    id: newId<StatusHistoryId>(),
    toolId,
    fromStatus: tool.status,
    toStatus: 'SUBMITTED',
    changedBy: actor.id,
    changedAt: now,
    reason,
    reviewComment: '',
  });

  return toolId;
}

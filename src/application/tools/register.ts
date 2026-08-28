import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound, validationFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type {
  AttachmentId,
  CategoryId,
  StatusHistoryId,
  ToolId,
  ToolVersionId,
} from '@/domain/shared/ids';
import { assertTransitionAllowed } from '@/domain/tool/status-machine';
import type { AutomationTool, AutomationToolVersion } from '@/domain/tool/types';
import { hasUsableAccess } from '@/domain/tool/types';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import type { ToolFormInput } from '@/lib/validation/tool';
import { NO_ACCESS_MESSAGE, emptyToolForm } from '@/lib/validation/tool';
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

    problemStatement: form.problemStatement,

    keyFeatures: form.keyFeatures,
    currentWorkflow: form.currentWorkflow,
    automatedWorkflow: form.automatedWorkflow,
    inputData: form.inputData,
    outputData: form.outputData,
    expectedUsers: form.expectedUsers,
    automationLevel: form.automationLevel,


    security: {
      classifications: form.classifications,
      sendsDataExternally: form.sendsDataExternally,
      externalTransferTargets: form.externalTransferTargets,
      dataStorageLocation: form.dataStorageLocation,
      dataRetentionPeriod: form.dataRetentionPeriod,
      hasExecutionLog: form.hasExecutionLog,
      requiresHumanApproval: form.requiresHumanApproval,
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
    problemStatement: version.problemStatement,

    keyFeatures: version.keyFeatures,
    currentWorkflow: version.currentWorkflow,
    automatedWorkflow: version.automatedWorkflow,
    inputData: version.inputData,
    outputData: version.outputData,
    expectedUsers: version.expectedUsers,
    automationLevel: version.automationLevel,

    classifications,
    sendsDataExternally: version.security.sendsDataExternally,
    externalTransferTargets: version.security.externalTransferTargets,
    dataStorageLocation: version.security.dataStorageLocation,
    dataRetentionPeriod: version.security.dataRetentionPeriod,
    hasExecutionLog: version.security.hasExecutionLog,
    requiresHumanApproval: version.security.requiresHumanApproval,



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

  /*
   * 실제로 쓸 수 있는 도구만 검토로 넘긴다 (리뷰 2026-08-27 3절).
   *
   * 폼 검증은 주소 두 개까지만 볼 수 있다. 프로그램 파일은 첨부라 폼 밖에
   * 있기 때문이다. 그래서 **여기서 첨부까지 함께 보고** 최종 판단한다.
   */
  const version = await repositories.tools.getVersion(tool.currentVersionId);
  const attachments = await repositories.tools.listAttachments(tool.currentVersionId);
  if (
    !hasUsableAccess({
      serviceUrl: version?.serviceUrl ?? '',
      repositoryUrl: version?.repositoryUrl ?? '',
      hasProgramFile: attachments.some((entry) => entry.kind === 'PROGRAM'),
    })
  ) {
    /*
     * 필드 오류만 붙이면 안 된다.
     *
     * 이 검사는 위저드 **4단계**에서 걸리는데 `serviceUrl` 은 1단계에 있다.
     * 필드에만 표시하면 사용자는 아무 반응 없이 신청이 안 되는 것처럼 느낀다.
     * 그래서 전체 메시지로도 같은 말을 낸다.
     */
    throw validationFailed({ serviceUrl: NO_ACCESS_MESSAGE }, NO_ACCESS_MESSAGE);
  }

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

/* -------------------------------------------------------------------------- */
/* 새 버전으로 고치기                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 이미 검토를 통과한 도구를 고칠 때 쓴다 (리뷰 2026-08-27 3절).
 *
 * "자동화 도구를 올렸으면 수정을 할 수가 없음. 개발자가 자신이 올린 글을
 *  수정할 수 있는 권한과 기능이 있어야 함."
 *
 * ## 왜 그냥 고치게 두지 않는가
 *
 * 승인된 도구의 내용을 바로 바꿀 수 있으면 검토가 무의미해진다. 심사를 통과한
 * 뒤에 다른 도구로 바꿔치기할 수 있기 때문이다. 그렇다고 못 고치게 두면
 * 만든 사람이 버그 하나 고칠 방법이 없다.
 *
 * 그래서 **새 버전을 만든다.** 지금 버전은 그대로 두고 사본을 떠서 임시저장
 * 상태로 되돌린다. 고쳐서 다시 신청하면 검토를 새로 받는다.
 *
 * ## 평가는 옮기지 않는다
 *
 * 평가는 버전에 붙는다. 새 버전에는 평가가 없는 것이 맞다 — 고치기 전 도구에
 * 대한 평가를 고친 뒤 도구의 평가로 쓰면 안 되기 때문이다.
 *
 * ## 첨부는 옮긴다
 *
 * 사용설명서와 프로그램 파일을 매번 다시 올리게 하면 아무도 안 고친다.
 * 새 버전에서 바꾸면 되고, 그대로 두면 그대로 이어진다.
 */
export async function startNewVersion(actor: Profile, toolId: string): Promise<ToolVersionId> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  assertCan(toActor(actor), 'tool:createVersion', {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
  });

  // 임시저장·보완요청 상태는 그냥 고치면 된다. 굳이 버전을 늘릴 이유가 없다.
  if (tool.status === 'DRAFT' || tool.status === 'REVISION_REQUIRED') {
    throw conflict(
      '이 도구는 지금 바로 수정할 수 있습니다. 새 버전을 만들지 않아도 됩니다.',
    );
  }

  // 검토가 진행 중일 때 새 버전을 만들면 검토자가 보던 것이 흔들린다.
  if (tool.status === 'SUBMITTED' || tool.status === 'HUMAN_REVIEW') {
    throw conflict(
      '검토가 진행 중입니다. 결과가 나온 뒤에 수정해 주세요. 급한 내용이면 검토자에게 알려 주세요.',
    );
  }

  const current = await repositories.tools.getVersion(tool.currentVersionId);
  if (!current) throw notFound('도구 버전');

  const now = new Date().toISOString();
  const versionId = newId<ToolVersionId>();

  await repositories.tools.insertVersion({
    ...current,
    id: versionId,
    versionLabel: nextVersionLabel(current.versionLabel),
    // 무엇을 고치는지는 본인이 적는다. 지어내지 않는다.
    changeNote: '',
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
  });

  for (const attachment of await repositories.tools.listAttachments(current.id)) {
    await repositories.tools.insertAttachment({
      ...attachment,
      id: newId<AttachmentId>(),
      toolVersionId: versionId,
      createdAt: now,
      createdBy: actor.id,
    });
  }

  await repositories.tools.updateTool({
    ...tool,
    status: 'DRAFT',
    currentVersionId: versionId,
    updatedAt: now,
  });

  await repositories.tools.insertStatusHistory({
    id: newId<StatusHistoryId>(),
    toolId: tool.id,
    fromStatus: tool.status,
    toStatus: 'DRAFT',
    changedBy: actor.id,
    changedAt: now,
    reason: '내용을 고치기 위해 새 버전을 만들었습니다.',
    reviewComment: '',
  });

  return versionId;
}

/**
 * `v1.0` → `v1.1`. 규칙에 안 맞으면 뒤에 `-수정`을 붙인다.
 *
 * 버전 번호를 사람이 매기게 두면 아무도 안 올린다. 기본값을 주고 위저드에서
 * 고칠 수 있게 한다.
 */
export function nextVersionLabel(label: string): string {
  const match = /^v?(\d+)\.(\d+)$/.exec(label.trim());
  if (!match) return label.trim() === '' ? 'v1.1' : `${label.trim()}-수정`;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  return `v${major}.${minor + 1}`;
}

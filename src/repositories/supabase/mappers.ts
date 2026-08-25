import type { AdminPermission } from '@/domain/authz/accounts';
import { isAdminPermission, isMemberType } from '@/domain/authz/accounts';
import type { MemberType } from '@/domain/authz/accounts';
import { isRuntimeKind } from '@/domain/tool/types';
import type {
  AutomationDemand,
  DemandAttachment,
  DemandComment,
  DemandMatch,
  DemandParticipant,
} from '@/domain/demand/types';
import type { EvaluationHistoryEntry, ToolEvaluation } from '@/domain/evaluation/types';
import type { Campus, Profile } from '@/domain/identity/types';
import type { Notice } from '@/domain/notice/types';
import type { RewardEntry } from '@/domain/reward/types';
import type {
  ImprovementRequest,
  ImprovementRequestHistoryEntry,
} from '@/domain/improvement/types';
import type { AuditLog, Notification } from '@/domain/observability/types';
import type { ReviewAssignment, ReviewComment } from '@/domain/review/types';
import { asId } from '@/domain/shared/ids';
import type { DemandId, ToolId, UserId } from '@/domain/shared/ids';
import type { RiskChecklist, RiskChecklistItem } from '@/domain/tool/risk-checklist-rules';
import type {
  AutomationTool,
  AutomationToolVersion,
  ToolAttachment,
  ToolCategory,
  ToolDataClassificationEntry,
  ToolStatusHistoryEntry,
} from '@/domain/tool/types';
import { DATA_CLASSIFICATIONS } from '@/domain/tool/types';

/**
 * Postgres 행(snake_case) ↔ 도메인 타입(camelCase) 변환.
 *
 * 도메인 타입이 단일 진실 원천이고, DB 스키마는 그것을 저장하는 한 가지 방법일 뿐이다.
 * DEMO 저장소는 도메인 타입을 그대로 JSON 으로 저장하므로 변환이 필요 없다.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * nullable 한 ID 컬럼을 변환한다.
 *
 * `row.x ? asId(row.x) : null` 로 쓰면 삼항 분기 안에서는 대상 프로퍼티의
 * 브랜드 타입이 추론에 전달되지 않아 `string` 으로 좁혀진다. 반환 타입을
 * `T | null` 로 두면 호출 지점의 문맥 타입에서 T 가 그대로 추론된다.
 */
function optId<T extends string>(value: unknown): T | null {
  return typeof value === 'string' && value.length > 0 ? (value as T) : null;
}

/* -------------------------------------------------------------------------- */
/* 조직 · 사용자                                                               */
/* -------------------------------------------------------------------------- */

export function toCampus(row: Row): Campus {
  return {
    id: asId(row.id),
    name: str(row.name),
    shortName: str(row.short_name),
    createdAt: str(row.created_at),
  };
}

/** profiles 행 + user_roles 조인 결과를 하나의 Profile 로 합친다. */
export function toProfile(row: Row): Profile {
  // 권한 행은 여러 개일 수 있다. 계정 종류는 하나, 세부 권한은 여러 줄로 들어온다.
  const roleRows = Array.isArray(row.user_roles)
    ? row.user_roles
    : row.user_roles
      ? [row.user_roles]
      : [];
  const accountType = roleRows.some((entry) => entry?.role === 'ADMIN') ? 'ADMIN' : 'USER';
  const adminPermissions =
    accountType === 'ADMIN'
      ? roleRows
          .map((entry) => entry?.admin_permission)
          .filter((value): value is AdminPermission => isAdminPermission(value))
      : [];

  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    email: str(row.email),
    name: str(row.name),
    title: str(row.title),
    accountType,
    adminPermissions,
    memberType: isMemberType(row.member_type) ? row.member_type : 'STAFF',
    isActive: row.is_active !== false,
    isDemoAccount: row.is_demo_account === true,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: row.deleted_at ?? null,
  };
}

export function fromProfile(profile: Profile): Row {
  return {
    id: profile.id,
    campus_id: profile.campusId,
    email: profile.email,
    name: profile.name,
    title: profile.title,
    is_active: profile.isActive,
    is_demo_account: profile.isDemoAccount,
    deleted_at: profile.deletedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* 참조 데이터                                                                 */
/* -------------------------------------------------------------------------- */

export function toCategory(row: Row): ToolCategory {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    code: str(row.code),
    name: str(row.name),
    description: str(row.description),
    sortOrder: num(row.sort_order) ?? 0,
    isActive: row.is_active !== false,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function fromCategory(category: ToolCategory): Row {
  return {
    id: category.id,
    campus_id: category.campusId,
    code: category.code,
    name: category.name,
    sort_order: category.sortOrder,
    is_active: category.isActive,
  };
}

/* -------------------------------------------------------------------------- */
/* 도구                                                                        */
/* -------------------------------------------------------------------------- */

export function toTool(row: Row): AutomationTool {
  const developers = Array.isArray(row.tool_developers) ? row.tool_developers : [];
  const tagRelations = Array.isArray(row.tool_tag_relations) ? row.tool_tag_relations : [];

  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    name: str(row.name),
    summary: str(row.summary),
    categoryId: asId(row.category_id),
    runtimeKind: isRuntimeKind(row.runtime_kind) ? row.runtime_kind : 'WEB',
    recommendedFor: Array.isArray(row.recommended_for)
      ? row.recommended_for.filter((value: unknown): value is MemberType => isMemberType(value))
      : [],
    ownerUserId: asId(row.owner_user_id),
    developerUserIds: developers.map((d: Row) => asId(d.user_id)),
    status: row.status ?? 'DRAFT',
    currentVersionId: asId(row.current_version_id ?? ''),
    tags: tagRelations
      .map((relation: Row) => str(relation.tool_tags?.name))
      .filter((name: string) => name.length > 0),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    createdBy: asId(row.created_by),
    deletedAt: row.deleted_at ?? null,
  };
}

export function fromTool(tool: AutomationTool): Row {
  return {
    id: tool.id,
    campus_id: tool.campusId,
    name: tool.name,
    summary: tool.summary,
    category_id: tool.categoryId,
    owner_user_id: tool.ownerUserId,
    status: tool.status,
    current_version_id: tool.currentVersionId || null,
    created_by: tool.createdBy,
    deleted_at: tool.deletedAt,
  };
}

/** 8종 분류를 항상 전부 채워서 돌려준다. 저장된 행이 없으면 미사용으로 본다. */
function toClassifications(rows: Row[]): ToolDataClassificationEntry[] {
  const byCode = new Map(rows.map((row) => [row.classification as string, row]));
  return DATA_CLASSIFICATIONS.map((classification) => {
    const row = byCode.get(classification);
    return {
      classification,
      inUse: row?.in_use === true,
      note: str(row?.note),
    };
  });
}

/**
 * 버전 상세는 여러 테이블에 나뉘어 있으므로 조인 결과를 받는다.
 * 조회 시 select 문에서 tool_integrations, tool_data_classifications,
 * 비용·성과 표는 더 쓰지 않는다 (리뷰 4.3절: 비용과 성과 단계 전체 삭제).
 */
export function toToolVersion(row: Row): AutomationToolVersion {
  return {
    id: asId(row.id),
    toolId: asId(row.tool_id),
    campusId: asId(row.campus_id),
    versionLabel: str(row.version_label),
    changeNote: str(row.change_note),
    problemStatement: str(row.problem_statement),
    keyFeatures: arr(row.key_features),
    currentWorkflow: str(row.current_workflow),
    automatedWorkflow: str(row.automated_workflow),
    inputData: str(row.input_data),
    outputData: str(row.output_data),
    expectedUsers: str(row.expected_users),
    automationLevel: row.automation_level ?? 'HUMAN_IN_THE_LOOP',
    security: {
      classifications: toClassifications(row.tool_data_classifications ?? []),
      sendsDataExternally: row.sends_data_externally === true,
      externalTransferTargets: str(row.external_transfer_targets),
      dataStorageLocation: str(row.data_storage_location),
      dataRetentionPeriod: str(row.data_retention_period),
      hasExecutionLog: row.has_execution_log === true,
      requiresHumanApproval: row.requires_human_approval !== false,
    },
    repositoryUrl: str(row.repository_url),
    serviceUrl: str(row.service_url),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    createdBy: asId(row.created_by),
    deletedAt: row.deleted_at ?? null,
  };
}

/** 버전 본체 컬럼만. 상세 테이블은 별도로 upsert 한다. */
export function fromToolVersion(version: AutomationToolVersion): Row {
  return {
    id: version.id,
    tool_id: version.toolId,
    campus_id: version.campusId,
    version_label: version.versionLabel,
    change_note: version.changeNote,
    problem_statement: version.problemStatement,
    key_features: version.keyFeatures,
    current_workflow: version.currentWorkflow,
    automated_workflow: version.automatedWorkflow,
    input_data: version.inputData,
    output_data: version.outputData,
    expected_users: version.expectedUsers,
    automation_level: version.automationLevel,
    sends_data_externally: version.security.sendsDataExternally,
    external_transfer_targets: version.security.externalTransferTargets,
    data_storage_location: version.security.dataStorageLocation,
    data_retention_period: version.security.dataRetentionPeriod,
    has_execution_log: version.security.hasExecutionLog,
    requires_human_approval: version.security.requiresHumanApproval,
    repository_url: version.repositoryUrl,
    service_url: version.serviceUrl,
    created_by: version.createdBy,
    deleted_at: version.deletedAt,
  };
}

export function fromToolCosts(version: AutomationToolVersion): Row {
  return {
    tool_version_id: version.id,
  };
}

export function fromToolMetrics(version: AutomationToolVersion): Row {
  return {
    tool_version_id: version.id,
  };
}

export function toStatusHistory(row: Row): ToolStatusHistoryEntry {
  return {
    id: asId(row.id),
    toolId: asId(row.tool_id),
    fromStatus: row.from_status ?? null,
    toStatus: row.to_status,
    changedBy: asId(row.changed_by),
    changedAt: str(row.changed_at),
    reason: str(row.reason),
    reviewComment: str(row.review_comment),
  };
}

export function toAttachment(row: Row): ToolAttachment {
  return {
    id: asId(row.id),
    toolVersionId: asId(row.tool_version_id),
    kind: row.kind ?? 'OTHER',
    fileName: str(row.file_name),
    mimeType: str(row.mime_type),
    byteSize: num(row.byte_size) ?? 0,
    storagePath: str(row.storage_path),
    createdAt: str(row.created_at),
    createdBy: asId(row.created_by),
  };
}

/* -------------------------------------------------------------------------- */
/* 검토                                                                        */
/* -------------------------------------------------------------------------- */

export function toReviewAssignment(row: Row): ReviewAssignment {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    toolId: asId(row.tool_id),
    toolVersionId: asId(row.tool_version_id),
    reviewerUserId: asId(row.reviewer_user_id),
    status: row.status ?? 'ASSIGNED',
    assignedBy: asId(row.assigned_by),
    assignedAt: str(row.assigned_at),
    completedAt: row.completed_at ?? null,
  };
}

export function fromReviewAssignment(assignment: ReviewAssignment): Row {
  return {
    id: assignment.id,
    campus_id: assignment.campusId,
    tool_id: assignment.toolId,
    tool_version_id: assignment.toolVersionId,
    reviewer_user_id: assignment.reviewerUserId,
    status: assignment.status,
    assigned_by: assignment.assignedBy,
    assigned_at: assignment.assignedAt,
    completed_at: assignment.completedAt,
  };
}

export function toReviewComment(row: Row): ReviewComment {
  return {
    id: asId(row.id),
    toolId: asId(row.tool_id),
    toolVersionId: asId(row.tool_version_id),
    authorUserId: asId(row.author_user_id),
    kind: row.kind ?? 'GENERAL',
    body: str(row.body),
    createdAt: str(row.created_at),
  };
}

export function toRiskChecklist(row: Row): RiskChecklist {
  return {
    id: asId(row.id),
    toolVersionId: asId(row.tool_version_id),
    items: (Array.isArray(row.items) ? row.items : []) as RiskChecklistItem[],
    riskLevel: row.risk_level ?? 'MEDIUM',
    rationale: str(row.rationale),
    reviewedBy: asId(row.reviewed_by),
    reviewedAt: str(row.reviewed_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function fromRiskChecklist(checklist: RiskChecklist): Row {
  return {
    id: checklist.id,
    tool_version_id: checklist.toolVersionId,
    items: checklist.items,
    risk_level: checklist.riskLevel,
    rationale: checklist.rationale,
    reviewed_by: checklist.reviewedBy,
    reviewed_at: checklist.reviewedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* 수요                                                                        */
/* -------------------------------------------------------------------------- */

export function toDemand(row: Row): AutomationDemand {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    title: str(row.title),
    requesterUserId: asId(row.requester_user_id),
    currentWorkDescription: str(row.current_work_description),
    mostPainfulStep: str(row.most_painful_step),
    inputMaterials: str(row.input_materials),
    desiredOutcome: str(row.desired_outcome),
    workFrequency: row.work_frequency ?? 'MONTHLY',
    expectedUserCount: num(row.expected_user_count),
    containsIdentifiablePersonalData: row.contains_identifiable_personal_data === true,
    containsAnonymizedPersonalData: row.contains_anonymized_personal_data === true,
    containsAcademicOrResearchData: row.contains_academic_or_research_data === true,
    requiresHumanApproval: row.requires_human_approval !== false,
    requiredFeatures: arr(row.required_features),
    optionalFeatures: arr(row.optional_features),
    expectedBenefit: str(row.expected_benefit),
    offeredTokens: num(row.offered_tokens),
    desiredCompletionDate: row.desired_completion_date ?? null,
    status: row.status ?? 'DRAFT',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    createdBy: asId(row.created_by),
    deletedAt: row.deleted_at ?? null,
  };
}

export function fromDemand(demand: AutomationDemand): Row {
  return {
    id: demand.id,
    campus_id: demand.campusId,
    title: demand.title,
    requester_user_id: demand.requesterUserId,
    most_painful_step: demand.mostPainfulStep,
    input_materials: demand.inputMaterials,
    desired_outcome: demand.desiredOutcome,
    work_frequency: demand.workFrequency,
    expected_user_count: demand.expectedUserCount,
    contains_personal_data: demand.containsIdentifiablePersonalData,
    contains_academic_or_research_data: demand.containsAcademicOrResearchData,
    requires_human_approval: demand.requiresHumanApproval,
    required_features: demand.requiredFeatures,
    optional_features: demand.optionalFeatures,
    expected_benefit: demand.expectedBenefit,
    offered_tokens: demand.offeredTokens,
    desired_completion_date: demand.desiredCompletionDate,
    status: demand.status,
    created_by: demand.createdBy,
    deleted_at: demand.deletedAt,
  };
}

export function toDemandMatch(row: Row): DemandMatch {
  return {
    id: asId(row.id),
    demandId: asId(row.demand_id),
    toolId: asId(row.tool_id),
    matchType: row.match_type,
    rationale: str(row.rationale),
    matchedBy: asId(row.matched_by),
    matchedAt: str(row.matched_at),
  };
}

export function fromDemandMatch(match: DemandMatch): Row {
  return {
    id: match.id,
    demand_id: match.demandId,
    tool_id: match.toolId,
    match_type: match.matchType,
    rationale: match.rationale,
    matched_by: match.matchedBy,
    matched_at: match.matchedAt,
  };
}

export function toDemandParticipant(row: Row): DemandParticipant {
  return {
    id: str(row.id),
    demandId: asId(row.demand_id),
    userId: asId(row.user_id),
    participantRole: row.participant_role ?? 'DEVELOPER',
    message: str(row.message),
    joinedAt: str(row.joined_at),
  };
}

/* -------------------------------------------------------------------------- */
/* 평가 · 개선 요청                                                            */
/* -------------------------------------------------------------------------- */

export function toEvaluation(row: Row): ToolEvaluation {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    toolId: asId(row.tool_id),
    toolVersionId: asId(row.tool_version_id),
    evaluatorUserId: asId(row.evaluator_user_id),
    scores: {
      overall: num(row.overall) ?? 3,
    },
    comment: str(row.comment),
    revisionCount: num(row.revision_count) ?? 0,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: row.deleted_at ?? null,
  };
}

export function fromEvaluation(evaluation: ToolEvaluation): Row {
  return {
    id: evaluation.id,
    campus_id: evaluation.campusId,
    tool_id: evaluation.toolId,
    tool_version_id: evaluation.toolVersionId,
    evaluator_user_id: evaluation.evaluatorUserId,
    overall: evaluation.scores.overall,
    comment: evaluation.comment,
    revision_count: evaluation.revisionCount,
    deleted_at: evaluation.deletedAt,
  };
}

export function toEvaluationHistory(row: Row): EvaluationHistoryEntry {
  return {
    id: str(row.id),
    evaluationId: asId(row.evaluation_id),
    previousScores: row.previous_scores,
    previousComment: str(row.previous_comment),
    changedBy: asId(row.changed_by),
    changedAt: str(row.changed_at),
  };
}

export function toImprovement(row: Row): ImprovementRequest {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    toolId: asId(row.tool_id),
    title: str(row.title),
    requestType: row.request_type,
    detail: str(row.detail),
    businessImpact: row.business_impact ?? 'MEDIUM',
    urgency: row.urgency ?? 'MEDIUM',
    requesterUserId: asId(row.requester_user_id),
    assignedDeveloperUserId: optId(row.assigned_developer_user_id),
    status: row.status ?? 'OPEN',
    handlingComment: str(row.handling_comment),
    targetCompletionDate: row.target_completion_date ?? null,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    createdBy: asId(row.created_by),
    deletedAt: row.deleted_at ?? null,
  };
}

export function fromImprovement(request: ImprovementRequest): Row {
  return {
    id: request.id,
    campus_id: request.campusId,
    tool_id: request.toolId,
    title: request.title,
    request_type: request.requestType,
    detail: request.detail,
    business_impact: request.businessImpact,
    urgency: request.urgency,
    requester_user_id: request.requesterUserId,
    assigned_developer_user_id: request.assignedDeveloperUserId,
    status: request.status,
    handling_comment: request.handlingComment,
    target_completion_date: request.targetCompletionDate,
    created_by: request.createdBy,
    deleted_at: request.deletedAt,
  };
}

export function toImprovementHistory(row: Row): ImprovementRequestHistoryEntry {
  return {
    id: str(row.id),
    improvementRequestId: asId(row.improvement_request_id),
    fromStatus: row.from_status ?? null,
    toStatus: row.to_status,
    changedBy: asId(row.changed_by),
    changedAt: str(row.changed_at),
    comment: str(row.comment),
  };
}

/* -------------------------------------------------------------------------- */
/* 감사 · 알림                                                                 */
/* -------------------------------------------------------------------------- */

export function toAuditLog(row: Row): AuditLog {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    action: str(row.action),
    actorUserId: optId(row.actor_user_id),
    actorRole: row.actor_role ?? null,
    targetType: str(row.target_type),
    targetId: row.target_id ?? null,
    outcome: row.outcome === 'FAILURE' ? 'FAILURE' : 'SUCCESS',
    summary: str(row.summary),
    changedFields: arr(row.changed_fields),
    ipAddress: row.ip_address ?? null,
    userAgent: row.user_agent ?? null,
    createdAt: str(row.created_at),
  };
}

export function fromAuditLog(log: AuditLog): Row {
  return {
    id: log.id,
    campus_id: log.campusId,
    action: log.action,
    actor_user_id: log.actorUserId,
    actor_role: log.actorRole,
    target_type: log.targetType,
    target_id: log.targetId,
    outcome: log.outcome,
    summary: log.summary,
    changed_fields: log.changedFields,
    ip_address: log.ipAddress,
    user_agent: log.userAgent,
  };
}

export function toNotification(row: Row): Notification {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    recipientUserId: asId(row.recipient_user_id),
    kind: row.kind,
    title: str(row.title),
    body: str(row.body),
    linkPath: str(row.link_path),
    readAt: row.read_at ?? null,
    createdAt: str(row.created_at),
  };
}

export function fromNotification(notification: Notification): Row {
  return {
    id: notification.id,
    campus_id: notification.campusId,
    recipient_user_id: notification.recipientUserId,
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    link_path: notification.linkPath,
    read_at: notification.readAt,
  };
}

/* -------------------------------------------------------------------------- */
/* 수요 문의 · 첨부                                                            */
/* -------------------------------------------------------------------------- */

export function toDemandComment(row: Row): DemandComment {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    demandId: asId(row.demand_id),
    authorUserId: asId(row.author_user_id),
    body: str(row.body),
    createdAt: str(row.created_at),
    deletedAt: row.deleted_at ?? null,
  };
}

export function toDemandAttachment(row: Row): DemandAttachment {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    demandId: asId(row.demand_id),
    fileName: str(row.file_name),
    storagePath: str(row.storage_path),
    contentType: str(row.content_type),
    byteSize: Number(row.byte_size ?? 0),
    uploadedBy: asId(row.uploaded_by),
    createdAt: str(row.created_at),
  };
}

/* -------------------------------------------------------------------------- */
/* 토큰 · 공지                                                                 */
/* -------------------------------------------------------------------------- */

export function toRewardEntry(row: Row): RewardEntry {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    userId: asId(row.user_id),
    kind: row.kind === 'AWARD' ? 'AWARD' : 'GRANT',
    amount: Number(row.amount ?? 0),
    demandId: row.demand_id ? asId<DemandId>(row.demand_id) : null,
    toolId: row.tool_id ? asId<ToolId>(row.tool_id) : null,
    awardedBy: row.awarded_by ? asId<UserId>(row.awarded_by) : null,
    note: str(row.note),
    createdAt: str(row.created_at),
  };
}

export function toNotice(row: Row): Notice {
  return {
    id: asId(row.id),
    campusId: asId(row.campus_id),
    title: str(row.title),
    body: str(row.body),
    pinned: row.pinned === true,
    isPublished: row.is_published !== false,
    authorUserId: asId(row.author_user_id),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

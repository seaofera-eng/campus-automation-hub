import 'server-only';
import { can } from '@/domain/authz/policies';
import type { Actor } from '@/domain/authz/policies';
import { summarizeEvaluations } from '@/domain/evaluation/scoring';
import type { EvaluationSummary } from '@/domain/evaluation/types';
import type { Department, Profile } from '@/domain/identity/types';
import type { ImprovementRequest } from '@/domain/improvement/types';
import { notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { CategoryId, DepartmentId, ToolId } from '@/domain/shared/ids';
import type { Page } from '@/domain/shared/pagination';
import { MAX_PAGE_SIZE, paginate } from '@/domain/shared/pagination';
import type { RiskChecklist } from '@/domain/tool/risk-checklist-rules';
import { availableTransitions } from '@/domain/tool/status-machine';
import type { TransitionRule } from '@/domain/tool/status-machine';
import type {
  AutomationTool,
  AutomationToolVersion,
  DataClassification,
  IntegrationSystem,
  ToolCategory,
  ToolListItem,
  ToolStatus,
  ToolStatusHistoryEntry,
} from '@/domain/tool/types';
import type { ToolEvaluation } from '@/domain/evaluation/types';
import type { ReviewComment } from '@/domain/review/types';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import type { ToolQuery } from '@/lib/validation/tool-query';
import { listAttachments, type AttachmentView } from './attachments';

/**
 * 도구 조회 (요구사항 11번).
 *
 * 저장소가 걸러 주지 못하는 **공개 범위**는 여기서 도메인 권한 함수로 다시 거른다.
 * DEMO 저장소에는 RLS 가 없고, Supabase 모드에서도 애플리케이션이 1차 방어선이다.
 */

export interface ToolListResult {
  actor: Profile;
  page: Page<ToolListItem>;
  categories: ToolCategory[];
  departments: Department[];
  /** 화면에 "내가 만든 도구" 필터를 보여줄지 */
  canCreate: boolean;
}

function readContext(tool: AutomationTool) {
  return {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
    departmentId: tool.departmentId,
    toolStatus: tool.status,
    visibility: tool.visibility,
  };
}

/** 이 사용자가 볼 수 있는 도구인가. */
export function canRead(actor: Actor, tool: AutomationTool): boolean {
  return can(actor, 'tool:read', readContext(tool));
}

export async function listTools(query: ToolQuery): Promise<ToolListResult> {
  const profile = await requireUser();
  const actor = toActor(profile);
  const repositories = getRepositories();

  const [categories, departments, profiles] = await Promise.all([
    repositories.reference.listCategories(profile.campusId),
    repositories.identity.listDepartments(profile.campusId),
    repositories.identity.listProfiles(profile.campusId),
  ]);

  // 공개 범위 필터링과 정렬을 애플리케이션에서 하므로 한 번에 넉넉히 읽는다.
  // 1단계 규모(수십~수백 건)에서 충분하다. 규모가 커지면 저장소에
  // 공개 범위 조건을 내려보내고 이 부분을 걷어낸다.
  const all = await repositories.tools.listTools(
    {
      campusId: profile.campusId,
      keyword: query.keyword || undefined,
      statuses: query.statuses.length > 0 ? (query.statuses as ToolStatus[]) : undefined,
      categoryIds:
        query.categoryIds.length > 0
          ? query.categoryIds.map((id) => asId<CategoryId>(id))
          : undefined,
      departmentIds:
        query.departmentIds.length > 0
          ? query.departmentIds.map((id) => asId<DepartmentId>(id))
          : undefined,
      dataClassifications:
        query.classifications.length > 0
          ? (query.classifications as DataClassification[])
          : undefined,
      involvingUserId: query.onlyMine ? profile.id : undefined,
    },
    query.sort,
    { page: 1, pageSize: MAX_PAGE_SIZE },
  );

  const visible = all.items.filter((tool) => canRead(actor, tool));
  const items = await enrich(visible, categories, departments, profiles);
  const sorted = sortItems(items, query.sort);

  return {
    actor: profile,
    page: paginate(sorted, { page: query.page, pageSize: query.pageSize }),
    categories,
    departments,
    canCreate: can(actor, 'tool:create'),
  };
}

async function enrich(
  tools: readonly AutomationTool[],
  categories: readonly ToolCategory[],
  departments: readonly Department[],
  profiles: readonly Profile[],
): Promise<ToolListItem[]> {
  const repositories = getRepositories();
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const departmentNames = new Map(
    departments.map((department) => [department.id, department.name]),
  );
  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return Promise.all(
    tools.map(async (tool) => {
      const [version, evaluations, improvements] = await Promise.all([
        repositories.tools.getVersion(tool.currentVersionId),
        repositories.evaluations.listByTool(tool.id),
        repositories.improvements.listByTool(tool.id),
      ]);

      const summary = summarizeEvaluations(evaluations);

      return {
        tool,
        // 버전이 없는 경우는 데이터가 깨진 상태다. 목록 전체를 실패시키지 않고
        // 빈 버전으로 그려서 최소한 항목이 보이게 한다.
        version: version ?? emptyVersion(tool),
        categoryName: categoryNames.get(tool.categoryId) ?? '미분류',
        departmentName: departmentNames.get(tool.departmentId) ?? '미지정',
        ownerName: personNames.get(tool.ownerUserId) ?? '알 수 없음',
        evaluationCount: summary.count,
        averageOverallScore: summary.averageOverall,
        openImprovementCount: improvements.filter(
          (request) => request.status !== 'CLOSED' && request.status !== 'REJECTED',
        ).length,
      } satisfies ToolListItem;
    }),
  );
}

function emptyVersion(tool: AutomationTool): AutomationToolVersion {
  return {
    id: tool.currentVersionId,
    toolId: tool.id,
    campusId: tool.campusId,
    versionLabel: '',
    changeNote: '',
    description: '',
    problemStatement: '',
    keyFeatures: [],
    currentWorkflow: '',
    automatedWorkflow: '',
    inputData: '',
    outputData: '',
    expectedUsers: '',
    monthlyExpectedUsage: null,
    automationLevel: 'AI_ASSISTED',
    integrations: [],
    otherIntegrationNote: '',
    security: {
      classifications: [],
      sendsDataExternally: false,
      externalTransferTargets: '',
      dataStorageLocation: '',
      dataRetentionPeriod: '',
      hasExecutionLog: false,
      requiresHumanApproval: true,
    },
    cost: {
      initialDevelopmentCost: null,
      monthlyOperationCost: null,
      monthlyLlmCost: null,
      externalServiceCost: null,
      costPerUser: null,
      costBasis: '',
    },
    performance: {
      currentProcessingMinutes: null,
      automatedProcessingMinutes: null,
      monthlySavedHours: null,
      errorReductionNote: '',
      expectedBenefit: '',
      measurementMethod: '',
    },
    repositoryUrl: '',
    serviceUrl: '',
    createdAt: tool.createdAt,
    updatedAt: tool.updatedAt,
    createdBy: tool.createdBy,
    deletedAt: null,
  };
}

/** 상태 정렬 순서 — 진행 중인 것이 앞에 온다. */
const STATUS_ORDER: Record<ToolStatus, number> = {
  SUBMITTED: 0,
  HUMAN_REVIEW: 1,
  AI_REVIEW: 2,
  REVISION_REQUIRED: 3,
  PILOT: 4,
  APPROVED: 5,
  DRAFT: 6,
  SUSPENDED: 7,
  RETIRED: 8,
};

function sortItems(items: ToolListItem[], sort: ToolQuery['sort']): ToolListItem[] {
  const sorted = [...items];
  switch (sort) {
    case 'NAME':
      return sorted.sort((a, b) => a.tool.name.localeCompare(b.tool.name, 'ko'));
    case 'STATUS':
      return sorted.sort(
        (a, b) =>
          STATUS_ORDER[a.tool.status] - STATUS_ORDER[b.tool.status] ||
          a.tool.name.localeCompare(b.tool.name, 'ko'),
      );
    case 'EVALUATION':
      // 평가가 없는 도구는 뒤로 보낸다. 0점으로 취급해 섞으면 오해를 부른다.
      return sorted.sort((a, b) => {
        const left = a.averageOverallScore;
        const right = b.averageOverallScore;
        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;
        return right - left || b.evaluationCount - a.evaluationCount;
      });
    case 'RECENT':
    default:
      return sorted.sort((a, b) => b.tool.updatedAt.localeCompare(a.tool.updatedAt));
  }
}

/* -------------------------------------------------------------------------- */
/* 상세                                                                        */
/* -------------------------------------------------------------------------- */

export interface ToolDetail {
  actor: Profile;
  tool: AutomationTool;
  version: AutomationToolVersion;
  versions: AutomationToolVersion[];
  categoryName: string;
  departmentName: string;
  ownerName: string;
  operationsManagerName: string | null;
  developerNames: string[];
  integrationSystems: IntegrationSystem[];
  attachments: AttachmentView[];
  evaluations: (ToolEvaluation & { evaluatorName: string })[];
  evaluationSummary: EvaluationSummary;
  improvements: (ImprovementRequest & { requesterName: string })[];
  statusHistory: (ToolStatusHistoryEntry & { changedByName: string })[];
  reviewComments: (ReviewComment & { authorName: string })[];
  riskChecklist: RiskChecklist | null;
  usage: { views: number; launches: number };
  /**
   * 지금 이 사용자가 실행할 수 있는 상태 전환.
   * 도메인 상태머신이 계산한다 — 화면이 스스로 판단하지 않는다.
   */
  transitions: TransitionRule[];
  /** 내가 이 도구의 현재 버전에 남긴 평가. 없으면 null. */
  myEvaluation: ToolEvaluation | null;
  /** 이 사용자가 할 수 있는 것 — 버튼 노출용. 실제 차단은 서버 액션이 한다. */
  permissions: {
    canEdit: boolean;
    canSubmit: boolean;
    canEvaluate: boolean;
    canRequestImprovement: boolean;
  };
}

export async function loadToolDetail(toolId: string): Promise<ToolDetail> {
  const profile = await requireUser();
  const actor = toActor(profile);
  const repositories = getRepositories();

  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');
  // 볼 수 없는 도구는 "없는 것"으로 취급한다. 존재 여부가 새어 나가지 않게 한다.
  if (!canRead(actor, tool)) throw notFound('도구');

  const [
    version,
    versions,
    categories,
    departments,
    profiles,
    integrationSystems,
    attachments,
    evaluations,
    improvements,
    statusHistory,
    reviewComments,
    riskChecklist,
    usage,
  ] = await Promise.all([
    repositories.tools.getVersion(tool.currentVersionId),
    repositories.tools.listVersions(tool.id),
    repositories.reference.listCategories(tool.campusId),
    repositories.identity.listDepartments(tool.campusId),
    repositories.identity.listProfiles(tool.campusId),
    repositories.reference.listIntegrationSystems(tool.campusId),
    listAttachments(toolId),
    repositories.evaluations.listByTool(tool.id),
    repositories.improvements.listByTool(tool.id),
    repositories.tools.listStatusHistory(tool.id),
    repositories.reviews.listComments(tool.id),
    repositories.reviews.getChecklist(tool.currentVersionId),
    repositories.observability.countUsageByTool(tool.id),
  ]);

  if (!version) throw notFound('도구 버전');

  const personNames = new Map(profiles.map((person) => [person.id, person.name]));
  const name = (id: string) => personNames.get(id as never) ?? '알 수 없음';

  const isOwnerOrDeveloper =
    tool.ownerUserId === profile.id || tool.developerUserIds.includes(profile.id);

  return {
    actor: profile,
    tool,
    version,
    versions,
    categoryName: categories.find((category) => category.id === tool.categoryId)?.name ?? '미분류',
    departmentName:
      departments.find((department) => department.id === tool.departmentId)?.name ?? '미지정',
    ownerName: name(tool.ownerUserId),
    operationsManagerName: tool.operationsManagerUserId
      ? name(tool.operationsManagerUserId)
      : null,
    developerNames: tool.developerUserIds.map(name),
    integrationSystems,
    attachments,
    evaluations: evaluations.map((evaluation) => ({
      ...evaluation,
      evaluatorName: name(evaluation.evaluatorUserId),
    })),
    evaluationSummary: summarizeEvaluations(evaluations),
    improvements: improvements.map((request) => ({
      ...request,
      requesterName: name(request.requesterUserId),
    })),
    statusHistory: statusHistory.map((entry) => ({
      ...entry,
      changedByName: name(entry.changedBy),
    })),
    reviewComments: reviewComments.map((comment) => ({
      ...comment,
      authorName: name(comment.authorUserId),
    })),
    riskChecklist,
    usage,
    myEvaluation:
      evaluations.find(
        (evaluation) =>
          evaluation.evaluatorUserId === profile.id &&
          evaluation.toolVersionId === tool.currentVersionId,
      ) ?? null,
    transitions: [
      ...availableTransitions(tool.status, {
        actorRole: profile.role,
        isOwner: isOwnerOrDeveloper,
        riskLevel: riskChecklist?.riskLevel ?? null,
        hasRiskChecklist: riskChecklist !== null,
      }),
    ],
    permissions: {
      canEdit:
        can(actor, 'tool:update', readContext(tool)) &&
        (tool.status === 'DRAFT' || tool.status === 'REVISION_REQUIRED'),
      canSubmit:
        can(actor, 'tool:submit', readContext(tool)) &&
        (tool.status === 'DRAFT' || tool.status === 'REVISION_REQUIRED') &&
        isOwnerOrDeveloper,
      // 요구사항 9번: 시범운영·정식 승인 상태에서만 평가할 수 있다.
      canEvaluate:
        can(actor, 'evaluation:create') &&
        (tool.status === 'PILOT' || tool.status === 'APPROVED'),
      canRequestImprovement:
        can(actor, 'improvement:create') && tool.status !== 'RETIRED',
    },
  };
}

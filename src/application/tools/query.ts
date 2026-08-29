import 'server-only';
import { hasAdminPermission } from '@/domain/authz/accounts';
import { can } from '@/domain/authz/policies';
import type { Actor } from '@/domain/authz/policies';
import { summarizeEvaluations } from '@/domain/evaluation/scoring';
import type { EvaluationSummary } from '@/domain/evaluation/types';
import type { Profile } from '@/domain/identity/types';
import type { ImprovementRequest } from '@/domain/improvement/types';
import { notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { CategoryId, ToolId } from '@/domain/shared/ids';
import type { Page } from '@/domain/shared/pagination';
import { ownerDeleteBlockReason } from '@/domain/tool/deletion';
import { MAX_PAGE_SIZE, paginate } from '@/domain/shared/pagination';
import type { RiskChecklist } from '@/domain/tool/risk-checklist-rules';
import { availableTransitions } from '@/domain/tool/status-machine';
import type { TransitionRule } from '@/domain/tool/status-machine';
import type {
  AutomationTool,
  AutomationToolVersion,
  DataClassification,
  ToolAccessKind,
  ToolCategory,
  ToolListItem,
  ToolStatus,
  ToolStatusHistoryEntry,
} from '@/domain/tool/types';
import { availableAccess } from '@/domain/tool/types';
import type { ToolEvaluation } from '@/domain/evaluation/types';
import type { ReviewComment } from '@/domain/review/types';
import { requireUser, toActor } from '@/lib/auth/current-user';
import {
  loadDuplicateAnalysis,
  loadRiskAnalysis,
  type DuplicateAnalysisView,
  type RiskAnalysisView,
} from '@/application/analysis/query';
import { RISK_FACTORS } from '@/domain/tool/risk-checklist-rules';
import type { RiskFactorCode } from '@/domain/tool/risk-checklist-rules';
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
  /** 화면에 "내가 만든 도구" 필터를 보여줄지 */
  canCreate: boolean;
}

function readContext(tool: AutomationTool) {
  return {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
    toolStatus: tool.status,
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

  const [categories, profiles] = await Promise.all([
    repositories.reference.listCategories(profile.campusId),
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
  const items = await enrich(visible, categories, profiles);
  const sorted = sortItems(items, query.sort);

  return {
    actor: profile,
    page: paginate(sorted, { page: query.page, pageSize: query.pageSize }),
    categories,
    canCreate: can(actor, 'tool:create'),
  };
}

/**
 * 도구에 카테고리·평가·사용량을 붙여 목록 항목으로 만든다.
 * 랜딩에서도 같은 형태를 쓰므로 밖으로 연다.
 */
export async function toListItems(tools: readonly AutomationTool[]): Promise<ToolListItem[]> {
  const repositories = getRepositories();
  const campusId = tools[0]?.campusId;
  if (!campusId) return [];

  const [categories, profiles] = await Promise.all([
    repositories.reference.listCategories(campusId),
    repositories.identity.listProfiles(campusId),
  ]);
  return enrich(tools, categories, profiles);
}

async function enrich(
  tools: readonly AutomationTool[],
  categories: readonly ToolCategory[],
  profiles: readonly Profile[],
): Promise<ToolListItem[]> {
  const repositories = getRepositories();
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return Promise.all(
    tools.map(async (tool) => {
      const [version, evaluations, improvements, usage, checklist] = await Promise.all([
        repositories.tools.getVersion(tool.currentVersionId),
        repositories.evaluations.listByTool(tool.id),
        repositories.improvements.listByTool(tool.id),
        repositories.observability.countUsageByTool(tool.id),
        // 목록 카드에 위험도를 보여주기 위해 함께 읽는다. 이미 도구당 네 번을
        // 병렬로 부르고 있어 한 번 더 붙는다고 성격이 달라지지 않는다.
        repositories.reviews.getChecklist(tool.currentVersionId),
      ]);

      const summary = summarizeEvaluations(evaluations);

      return {
        tool,
        // 버전이 없는 경우는 데이터가 깨진 상태다. 목록 전체를 실패시키지 않고
        // 빈 버전으로 그려서 최소한 항목이 보이게 한다.
        version: version ?? emptyVersion(tool),
        categoryName: categoryNames.get(tool.categoryId) ?? '미분류',
        ownerName: personNames.get(tool.ownerUserId) ?? '알 수 없음',
        evaluationCount: summary.count,
        launchCount: usage.launches,
        averageOverallScore: summary.averageOverall,
        openImprovementCount: improvements.filter(
          (request) => request.status !== 'CLOSED' && request.status !== 'REJECTED',
        ).length,
        riskLevel: checklist?.riskLevel ?? null,
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
    problemStatement: '',
    keyFeatures: [],
    currentWorkflow: '',
    automatedWorkflow: '',
    inputData: '',
    outputData: '',
    expectedUsers: '',
    automationLevel: 'AI_ASSISTED',
    security: {
      classifications: [],
      sendsDataExternally: false,
      externalTransferTargets: '',
      dataStorageLocation: '',
      dataRetentionPeriod: '',
      hasExecutionLog: false,
      requiresHumanApproval: true,
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
function sortItems(items: ToolListItem[], sort: ToolQuery['sort']): ToolListItem[] {
  const sorted = [...items];
  switch (sort) {
    case 'NAME':
      return sorted.sort((a, b) => a.tool.name.localeCompare(b.tool.name, 'ko'));
    case 'POPULAR':
      // 실제로 열어 본 횟수 순. 평가가 없어도 "많이 쓰이는 것"은 알 수 있다.
      return sorted.sort(
        (a, b) => b.launchCount - a.launchCount || a.tool.name.localeCompare(b.tool.name, 'ko'),
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

const RISK_FACTOR_LABELS: ReadonlyMap<RiskFactorCode, string> = new Map(
  RISK_FACTORS.map((factor) => [factor.code, factor.label]),
);

export interface ToolDetail {
  actor: Profile;
  tool: AutomationTool;
  version: AutomationToolVersion;
  versions: AutomationToolVersion[];
  categoryName: string;
  ownerName: string;
  developerNames: string[];
  attachments: AttachmentView[];
  /** 평가는 익명이다. 작성자 이름을 화면으로 내보내지 않는다 (리뷰 7절). */
  evaluations: ToolEvaluation[];
  evaluationSummary: EvaluationSummary;
  improvements: (ImprovementRequest & { requesterName: string })[];
  statusHistory: (ToolStatusHistoryEntry & { changedByName: string })[];
  reviewComments: (ReviewComment & { authorName: string })[];
  riskChecklist: RiskChecklist | null;
  /** 미리 돌려 둔 위험도 분석. 검토 화면과 같은 내용을 보여 준다. */
  riskAnalysis: RiskAnalysisView | null;
  /** 미리 돌려 둔 중복 분석. 등록 검토에서 무엇이 걸렸는지 공개한다. */
  duplicateAnalysis: DuplicateAnalysisView | null;
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
    /**
     * 새 버전을 만들어 수정할 수 있는가 (리뷰 2026-08-27 3절).
     *
     * 검토를 통과한 도구는 바로 고칠 수 없다. 사본을 떠서 임시저장으로
     * 되돌린 뒤 고치고 다시 신청한다.
     */
    canStartNewVersion: boolean;
    /**
     * 삭제 버튼을 보여 줄 것인가 (리뷰 2026-08-30).
     *
     * 자격만 본다. **지금 지울 수 있는지는 `deleteBlockedReason` 이 따로 답한다** —
     * 버튼을 감추면 "삭제가 없는 서비스"로 보이므로, 자격이 있으면 보여 주고
     * 안 되는 이유를 창에서 설명한다.
     */
    canDelete: boolean;
  };
  /** 지금 지울 수 없는 이유. 지울 수 있으면 null. */
  deleteBlockedReason: string | null;
  /** 이 도구를 실제로 쓸 수 있는 방법. 없으면 빈 배열이다. */
  access: ToolAccessKind[];
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
    profiles,
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
    repositories.identity.listProfiles(tool.campusId),
    listAttachments(toolId),
    repositories.evaluations.listByTool(tool.id),
    repositories.improvements.listByTool(tool.id),
    repositories.tools.listStatusHistory(tool.id),
    repositories.reviews.listComments(tool.id),
    repositories.reviews.getChecklist(tool.currentVersionId),
    repositories.observability.countUsageByTool(tool.id),
  ]);

  if (!version) throw notFound('도구 버전');

  // 저장된 분석을 읽는다. 체크리스트가 있어야 갈린 항목을 계산할 수 있어서
  // 위 Promise.all 뒤에 온다.
  const [riskAnalysis, duplicateAnalysis] = await Promise.all([
    loadRiskAnalysis(tool.currentVersionId, tool.campusId, riskChecklist, RISK_FACTOR_LABELS),
    loadDuplicateAnalysis(tool.currentVersionId, tool.campusId),
  ]);

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
    ownerName: name(tool.ownerUserId),
    developerNames: tool.developerUserIds.map(name),
    attachments,
    evaluations,
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
    riskAnalysis,
    duplicateAnalysis,
    usage,
    myEvaluation:
      evaluations.find(
        (evaluation) =>
          evaluation.evaluatorUserId === profile.id &&
          evaluation.toolVersionId === tool.currentVersionId,
      ) ?? null,
    transitions: [
      ...availableTransitions(tool.status, {
        accountType: profile.accountType,
    adminPermissions: profile.adminPermissions,
        isOwner: isOwnerOrDeveloper,
        riskLevel: riskChecklist?.riskLevel ?? null,
        hasRiskChecklist: riskChecklist !== null,
      }),
    ],
    permissions: {
      canEdit:
        can(actor, 'tool:update', readContext(tool)) &&
        (tool.status === 'DRAFT' || tool.status === 'REVISION_REQUIRED'),
      // 검토가 끝난 뒤에만. 검토 중(SUBMITTED·HUMAN_REVIEW)에 새 버전을 만들면
      // 검토자가 보던 내용이 발밑에서 바뀐다.
      canStartNewVersion:
        can(actor, 'tool:createVersion', readContext(tool)) &&
        (tool.status === 'PILOT' ||
          tool.status === 'APPROVED' ||
          tool.status === 'SUSPENDED'),
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
      canDelete: can(actor, 'tool:delete', readContext(tool)),
    },
    // 운영 권한자는 상태와 무관하게 지울 수 있다. 서비스가 같은 판단을 다시 한다.
    deleteBlockedReason: hasAdminPermission(
      profile.accountType,
      profile.adminPermissions,
      'MANAGE_TOOLS',
    )
      ? null
      : ownerDeleteBlockReason(tool.status),
    access: availableAccess({
      serviceUrl: version.serviceUrl,
      repositoryUrl: version.repositoryUrl,
      hasProgramFile: attachments.some((entry) => entry.kind === 'PROGRAM'),
    }),
  };
}

import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { hasAdminPermission } from '@/domain/authz/accounts';
import { notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { ToolId } from '@/domain/shared/ids';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import type { ReviewAssignment, ReviewComment } from '@/domain/review/types';
import type { RiskChecklist } from '@/domain/tool/risk-checklist-rules';
import { emptyChecklistItems } from '@/domain/tool/risk-checklist-rules';
import { availableTransitions } from '@/domain/tool/status-machine';
import type { TransitionRule } from '@/domain/tool/status-machine';
import type {
  AutomationTool,
  AutomationToolVersion,
  ToolStatus,
} from '@/domain/tool/types';
import { isSensitiveClassification } from '@/domain/tool/types';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 검토 작업 큐 (요구사항 11번).
 *
 * 검토자가 "지금 무엇을 해야 하는지" 한 화면에서 보게 하는 것이 목적이다.
 * 그래서 민감 데이터 사용 여부와 체크리스트 작성 여부를 목록에서 바로 보여준다.
 */

/** 검토 대상 상태 — 이 상태의 도구만 큐에 올라온다. */
const REVIEWABLE_STATUSES: readonly ToolStatus[] = [
  'SUBMITTED',
  'HUMAN_REVIEW',
  'REVISION_REQUIRED',
  'PILOT',
];

export interface ReviewQueueEntry {
  toolId: string;
  name: string;
  summary: string;
  status: ToolStatus;
  categoryName: string;
  departmentName: string;
  ownerName: string;
  submittedAt: string;
  assignment: ReviewAssignment | null;
  assigneeName: string | null;
  hasRiskChecklist: boolean;
  usesSensitiveData: boolean;
  /** 내가 배정받은 건인가 */
  isMine: boolean;
}

export interface ReviewQueue {
  actor: Profile;
  entries: ReviewQueueEntry[];
  /** 내가 배정받은 건수 */
  mineCount: number;
  /** 아직 아무도 배정받지 않은 건수 */
  unassignedCount: number;
}

export async function loadReviewQueue(): Promise<ReviewQueue> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'review:list');

  const repositories = getRepositories();
  const [page, categories, departments, profiles] = await Promise.all([
    repositories.tools.listTools(
      { campusId: actor.campusId, statuses: REVIEWABLE_STATUSES },
      'STATUS',
      { page: 1, pageSize: MAX_PAGE_SIZE },
    ),
    repositories.reference.listCategories(actor.campusId),
    repositories.identity.listDepartments(actor.campusId),
    repositories.identity.listProfiles(actor.campusId),
  ]);

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const departmentNames = new Map(
    departments.map((department) => [department.id, department.name]),
  );
  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  const entries = await Promise.all(
    page.items.map(async (tool) => {
      const [version, assignment, checklist, history] = await Promise.all([
        repositories.tools.getVersion(tool.currentVersionId),
        repositories.reviews.getAssignmentForVersion(tool.currentVersionId),
        repositories.reviews.getChecklist(tool.currentVersionId),
        repositories.tools.listStatusHistory(tool.id),
      ]);

      const submitted = history.find((entry) => entry.toStatus === 'SUBMITTED');

      return {
        toolId: tool.id as string,
        name: tool.name,
        summary: tool.summary,
        status: tool.status,
        categoryName: categoryNames.get(tool.categoryId) ?? '미분류',
        departmentName: departmentNames.get(tool.departmentId) ?? '미지정',
        ownerName: personNames.get(tool.ownerUserId) ?? '알 수 없음',
        submittedAt: submitted?.changedAt ?? tool.updatedAt,
        assignment,
        assigneeName: assignment ? (personNames.get(assignment.reviewerUserId) ?? null) : null,
        hasRiskChecklist: checklist !== null,
        usesSensitiveData:
          version?.security.classifications.some(
            (entry) => entry.inUse && isSensitiveClassification(entry.classification),
          ) ?? false,
        isMine: assignment?.reviewerUserId === actor.id,
      } satisfies ReviewQueueEntry;
    }),
  );

  // 내가 맡은 것 → 미배정 → 나머지 순. 그 안에서는 오래 기다린 것부터.
  const sorted = entries.sort((a, b) => {
    const rank = (entry: ReviewQueueEntry) => (entry.isMine ? 0 : entry.assignment ? 2 : 1);
    return rank(a) - rank(b) || a.submittedAt.localeCompare(b.submittedAt);
  });

  return {
    actor,
    entries: sorted,
    mineCount: sorted.filter((entry) => entry.isMine).length,
    unassignedCount: sorted.filter((entry) => entry.assignment === null).length,
  };
}

/* -------------------------------------------------------------------------- */
/* 검토 상세                                                                    */
/* -------------------------------------------------------------------------- */

export interface ReviewDetail {
  actor: Profile;
  tool: AutomationTool;
  version: AutomationToolVersion;
  categoryName: string;
  departmentName: string;
  ownerName: string;
  assignment: ReviewAssignment | null;
  assigneeName: string | null;
  checklist: RiskChecklist | null;
  comments: (ReviewComment & { authorName: string })[];
  /** 지금 이 사용자가 실행할 수 있는 상태 전환 */
  transitions: TransitionRule[];
  reviewers: { id: string; name: string }[];
  canAssignSelf: boolean;
}

export async function loadReviewDetail(toolId: string): Promise<ReviewDetail> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'review:list');

  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  const [version, categories, departments, profiles, assignment, checklist, comments] =
    await Promise.all([
      repositories.tools.getVersion(tool.currentVersionId),
      repositories.reference.listCategories(tool.campusId),
      repositories.identity.listDepartments(tool.campusId),
      repositories.identity.listProfiles(tool.campusId),
      repositories.reviews.getAssignmentForVersion(tool.currentVersionId),
      repositories.reviews.getChecklist(tool.currentVersionId),
      repositories.reviews.listComments(tool.id),
    ]);

  if (!version) throw notFound('도구 버전');

  const personNames = new Map(profiles.map((profile) => [profile.id, profile.name]));

  return {
    actor,
    tool,
    version,
    categoryName: categories.find((category) => category.id === tool.categoryId)?.name ?? '미분류',
    departmentName:
      departments.find((department) => department.id === tool.departmentId)?.name ?? '미지정',
    ownerName: personNames.get(tool.ownerUserId) ?? '알 수 없음',
    assignment,
    assigneeName: assignment ? (personNames.get(assignment.reviewerUserId) ?? null) : null,
    checklist,
    comments: comments.map((comment) => ({
      ...comment,
      authorName: personNames.get(comment.authorUserId) ?? '알 수 없음',
    })),
    transitions: [
      ...availableTransitions(tool.status, {
        accountType: actor.accountType,
    adminPermissions: actor.adminPermissions,
        isOwner: tool.ownerUserId === actor.id || tool.developerUserIds.includes(actor.id),
        riskLevel: checklist?.riskLevel ?? null,
        hasRiskChecklist: checklist !== null,
      }),
    ],
    reviewers: profiles
      .filter((profile) => hasAdminPermission(profile.accountType, profile.adminPermissions, 'REVIEW'))
      .map((profile) => ({ id: profile.id as string, name: profile.name })),
    canAssignSelf:
      assignment?.reviewerUserId !== actor.id &&
      (tool.status === 'SUBMITTED' || tool.status === 'HUMAN_REVIEW'),
  };
}

/** 체크리스트가 없을 때 화면에 보여줄 빈 항목. */
export { emptyChecklistItems };

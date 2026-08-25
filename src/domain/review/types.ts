import type {
  CampusId,
  ReviewAssignmentId,
  ReviewCommentId,
  ToolId,
  ToolVersionId,
  UserId,
} from '../shared/ids';

export const REVIEW_ASSIGNMENT_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type ReviewAssignmentStatus = (typeof REVIEW_ASSIGNMENT_STATUSES)[number];

export const REVIEW_ASSIGNMENT_STATUS_LABELS: Record<ReviewAssignmentStatus, string> = {
  ASSIGNED: '배정됨',
  IN_PROGRESS: '검토 중',
  COMPLETED: '검토 완료',
};

export interface ReviewAssignment {
  id: ReviewAssignmentId;
  campusId: CampusId;
  toolId: ToolId;
  toolVersionId: ToolVersionId;
  reviewerUserId: UserId;
  status: ReviewAssignmentStatus;
  assignedBy: UserId;
  assignedAt: string;
  completedAt: string | null;
}

export const REVIEW_COMMENT_KINDS = ['GENERAL', 'REVISION_REQUEST', 'APPROVAL_OPINION'] as const;
export type ReviewCommentKind = (typeof REVIEW_COMMENT_KINDS)[number];

export const REVIEW_COMMENT_KIND_LABELS: Record<ReviewCommentKind, string> = {
  GENERAL: '일반 의견',
  REVISION_REQUEST: '보완 요청',
  APPROVAL_OPINION: '승인 의견',
};

export interface ReviewComment {
  id: ReviewCommentId;
  toolId: ToolId;
  toolVersionId: ToolVersionId;
  authorUserId: UserId;
  kind: ReviewCommentKind;
  body: string;
  createdAt: string;
}

/** 검토 큐 항목 */
export interface ReviewQueueItem {
  toolId: ToolId;
  toolName: string;
  toolSummary: string;
  categoryName: string;
  status: string;
  submittedAt: string;
  assignment: ReviewAssignment | null;
  hasRiskChecklist: boolean;
  /** 민감 데이터 사용 여부 — 큐에서 우선순위 판단에 쓴다 */
  usesSensitiveData: boolean;
}

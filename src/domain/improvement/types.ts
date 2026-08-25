import type { CampusId, ImprovementRequestId, ToolId, UserId } from '../shared/ids';

export const IMPROVEMENT_STATUSES = [
  'OPEN',
  'REVIEWING',
  'ACCEPTED',
  'IN_PROGRESS',
  'RELEASED',
  'REJECTED',
  'CLOSED',
] as const;

export type ImprovementStatus = (typeof IMPROVEMENT_STATUSES)[number];

export const IMPROVEMENT_STATUS_LABELS: Record<ImprovementStatus, string> = {
  OPEN: '접수',
  REVIEWING: '검토 중',
  ACCEPTED: '반영 확정',
  IN_PROGRESS: '처리 중',
  RELEASED: '반영 완료',
  REJECTED: '반려',
  CLOSED: '종료',
};

export const IMPROVEMENT_TYPES = [
  'BUG_FIX',
  'NEW_FEATURE',
  'INTEGRATION',
  'USABILITY',
  'SECURITY',
  'COST',
  'DOCUMENTATION',
] as const;

export type ImprovementType = (typeof IMPROVEMENT_TYPES)[number];

export const IMPROVEMENT_TYPE_LABELS: Record<ImprovementType, string> = {
  BUG_FIX: '오류 수정',
  NEW_FEATURE: '신규 기능',
  INTEGRATION: '연동 추가',
  USABILITY: '사용성 개선',
  SECURITY: '보안 개선',
  COST: '비용 개선',
  DOCUMENTATION: '문서 개선',
};

export const IMPACT_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const IMPACT_LEVEL_LABELS: Record<ImpactLevel, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
};

export const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const URGENCY_LEVEL_LABELS: Record<UrgencyLevel, string> = {
  LOW: '여유 있음',
  MEDIUM: '보통',
  HIGH: '시급',
};

export interface ImprovementRequest {
  id: ImprovementRequestId;
  campusId: CampusId;
  toolId: ToolId;
  title: string;
  requestType: ImprovementType;
  detail: string;
  businessImpact: ImpactLevel;
  urgency: UrgencyLevel;
  requesterUserId: UserId;
  assignedDeveloperUserId: UserId | null;
  status: ImprovementStatus;
  /** 처리 담당자의 의견 */
  handlingComment: string;
  /** 목표 완료일 (ISO date) */
  targetCompletionDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserId;
  deletedAt: string | null;
}

export interface ImprovementRequestHistoryEntry {
  id: string;
  improvementRequestId: ImprovementRequestId;
  fromStatus: ImprovementStatus | null;
  toStatus: ImprovementStatus;
  changedBy: UserId;
  changedAt: string;
  comment: string;
}

export interface ImprovementListItem {
  request: ImprovementRequest;
  toolName: string;
  requesterName: string;
  assigneeName: string | null;
}

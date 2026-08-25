import type { AuditLogId, CampusId, NotificationId, ToolId, UserId } from '../shared/ids';

/**
 * 감사 로그 (요구사항 18번).
 *
 * 주요 등록·수정·상태변경을 남긴다. 관리자 작업도 예외 없이 기록한다.
 * 민감한 값 자체는 저장하지 않고 "무엇이 바뀌었는지"만 남긴다.
 */
export interface AuditLog {
  id: AuditLogId;
  campusId: CampusId;
  /** 예: tool.submit, demand.match, admin.changeUserRole */
  action: string;
  actorUserId: UserId | null;
  actorRole: string | null;
  /** 대상 리소스 종류 (tool, demand, evaluation, ...) */
  targetType: string;
  targetId: string | null;
  /** 성공/실패 */
  outcome: 'SUCCESS' | 'FAILURE';
  /** 실패 사유 또는 요약. 개인정보를 넣지 않는다. */
  summary: string;
  /** 변경된 필드 이름 목록. 값은 저장하지 않는다. */
  changedFields: string[];
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** 도구 사용 현황 집계용 이벤트 */
export interface UsageEvent {
  id: string;
  campusId: CampusId;
  toolId: ToolId;
  userId: UserId | null;
  /** VIEW: 상세 조회, LAUNCH: 서비스 접속 링크 클릭 */
  eventType: 'VIEW' | 'LAUNCH';
  occurredAt: string;
}

export const NOTIFICATION_KINDS = [
  'TOOL_STATUS_CHANGED',
  'REVIEW_ASSIGNED',
  'REVISION_REQUESTED',
  'IMPROVEMENT_ASSIGNED',
  'IMPROVEMENT_STATUS_CHANGED',
  'DEMAND_MATCHED',
  'DEMAND_PARTICIPANT_JOINED',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface Notification {
  id: NotificationId;
  campusId: CampusId;
  recipientUserId: UserId;
  kind: NotificationKind;
  title: string;
  body: string;
  /** 클릭 시 이동할 앱 내부 경로 */
  linkPath: string;
  readAt: string | null;
  createdAt: string;
}

/** 관리자 대시보드 집계 (요구사항 11번) */
export interface DashboardStats {
  totalTools: number;
  awaitingReviewTools: number;
  pilotTools: number;
  approvedTools: number;
  suspendedTools: number;
  openDemands: number;
  openImprovements: number;
  totalEvaluations: number;
  byCategory: { label: string; count: number }[];
  /** 어디서 실행하는 도구가 많은지 (부서별 분포를 대신한다) */
  byRuntime: { label: string; count: number }[];
  byStatus: { label: string; count: number }[];
}

export interface ActivityEntry {
  id: string;
  occurredAt: string;
  /** 화면에 표시할 한 줄 설명 */
  description: string;
  actorName: string;
  linkPath: string | null;
  kind: 'TOOL_STATUS' | 'DEMAND' | 'EVALUATION' | 'IMPROVEMENT';
}

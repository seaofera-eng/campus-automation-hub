/**
 * 도메인 식별자.
 *
 * 브랜드 타입으로 서로 다른 종류의 ID가 뒤섞이는 것을 컴파일 타임에 막는다.
 * (예: ToolId 자리에 UserId를 넘기면 타입 오류)
 */

declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

export type CampusId = Brand<string, 'CampusId'>;
export type UserId = Brand<string, 'UserId'>;
export type DepartmentId = Brand<string, 'DepartmentId'>;
export type ToolId = Brand<string, 'ToolId'>;
export type ToolVersionId = Brand<string, 'ToolVersionId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type TagId = Brand<string, 'TagId'>;
export type IntegrationSystemId = Brand<string, 'IntegrationSystemId'>;
export type DemandId = Brand<string, 'DemandId'>;
export type DemandMatchId = Brand<string, 'DemandMatchId'>;
export type EvaluationId = Brand<string, 'EvaluationId'>;
export type ImprovementRequestId = Brand<string, 'ImprovementRequestId'>;
export type ReviewAssignmentId = Brand<string, 'ReviewAssignmentId'>;
export type ReviewCommentId = Brand<string, 'ReviewCommentId'>;
export type RiskChecklistId = Brand<string, 'RiskChecklistId'>;
export type AttachmentId = Brand<string, 'AttachmentId'>;
export type AuditLogId = Brand<string, 'AuditLogId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type StatusHistoryId = Brand<string, 'StatusHistoryId'>;

/** 저장소에서 읽은 문자열을 도메인 ID로 좁힌다. 값 자체는 바뀌지 않는다. */
export function asId<T extends string>(value: string): T {
  return value as T;
}

/** 새 식별자를 만든다. UUID v4 형식이라 Postgres uuid 컬럼과 그대로 호환된다. */
export function newId<T extends string>(): T {
  return crypto.randomUUID() as T;
}

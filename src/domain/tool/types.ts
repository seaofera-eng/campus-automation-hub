import type { MemberType } from '../authz/accounts';
import type {
  AttachmentId,
  CampusId,
  CategoryId,
  StatusHistoryId,
  ToolId,
  ToolVersionId,
  UserId,
} from '../shared/ids';

/* -------------------------------------------------------------------------- */
/* 상태                                                                        */
/* -------------------------------------------------------------------------- */

export const TOOL_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'AI_REVIEW',
  'HUMAN_REVIEW',
  'REVISION_REQUIRED',
  'PILOT',
  'APPROVED',
  'SUSPENDED',
  'RETIRED',
] as const;

export type ToolStatus = (typeof TOOL_STATUSES)[number];

export const TOOL_STATUS_LABELS: Record<ToolStatus, string> = {
  DRAFT: '임시저장',
  SUBMITTED: '등록 신청',
  AI_REVIEW: 'AI 검토',
  HUMAN_REVIEW: '담당자 검토',
  REVISION_REQUIRED: '보완 요청',
  PILOT: '시범운영',
  APPROVED: '정식 승인',
  SUSPENDED: '사용 중지',
  RETIRED: '폐기',
};

export const TOOL_STATUS_DESCRIPTIONS: Record<ToolStatus, string> = {
  DRAFT: '작성 중입니다. 아직 검토 대상이 아닙니다.',
  SUBMITTED: '등록을 신청했습니다. 검토자 배정을 기다리는 중입니다.',
  AI_REVIEW: 'AI 자동 검토 단계입니다. (2단계에서 제공 예정)',
  HUMAN_REVIEW: '검토자가 내용과 위험 요소를 확인하고 있습니다.',
  REVISION_REQUIRED: '검토자가 보완을 요청했습니다. 수정 후 다시 신청해 주세요.',
  PILOT: '제한된 범위에서 시범운영 중입니다.',
  APPROVED: '정식 승인되어 사용할 수 있습니다.',
  SUSPENDED: '문제가 확인되어 사용이 중지되었습니다.',
  RETIRED: '더 이상 사용하지 않는 도구입니다.',
};

/** 평가를 등록할 수 있는 상태 (요구사항 9번) */
export const EVALUABLE_STATUSES: readonly ToolStatus[] = ['PILOT', 'APPROVED'];

/* -------------------------------------------------------------------------- */
/* 분류 값                                                                     */
/* -------------------------------------------------------------------------- */

export const AUTOMATION_LEVELS = ['AI_ASSISTED', 'HUMAN_IN_THE_LOOP', 'FULLY_AUTOMATED'] as const;
export type AutomationLevel = (typeof AUTOMATION_LEVELS)[number];

export const AUTOMATION_LEVEL_LABELS: Record<AutomationLevel, string> = {
  AI_ASSISTED: 'AI 보조',
  HUMAN_IN_THE_LOOP: '사람 승인형 반자동화',
  FULLY_AUTOMATED: '완전 자동화',
};

export const AUTOMATION_LEVEL_DESCRIPTIONS: Record<AutomationLevel, string> = {
  AI_ASSISTED: '사람이 직접 실행하고 AI는 초안·제안만 제공합니다.',
  HUMAN_IN_THE_LOOP: '자동으로 처리하되 최종 결과는 사람이 확인·승인합니다.',
  FULLY_AUTOMATED: '사람의 확인 없이 처음부터 끝까지 자동으로 실행됩니다.',
};



export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  CRITICAL: '매우 높음',
};

/* -------------------------------------------------------------------------- */
/* 데이터 분류 (요구사항 6번 보안·데이터 정보)                                  */
/* -------------------------------------------------------------------------- */

export const DATA_CLASSIFICATIONS = [
  'PUBLIC',
  'INTERNAL',
  'PERSONAL',
  'ACADEMIC',
  'GRADE',
  'COUNSELING',
  'RESEARCH',
  'FINANCIAL',
] as const;

export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export const DATA_CLASSIFICATION_LABELS: Record<DataClassification, string> = {
  PUBLIC: '공개정보',
  INTERNAL: '내부정보',
  PERSONAL: '개인정보',
  ACADEMIC: '학사정보',
  GRADE: '성적정보',
  COUNSELING: '상담정보',
  RESEARCH: '연구정보',
  FINANCIAL: '재정정보',
};

/** 민감 분류: 목록·상세에서 아이콘과 텍스트로 눈에 띄게 표시한다. */
export const SENSITIVE_CLASSIFICATIONS: readonly DataClassification[] = [
  'PERSONAL',
  'GRADE',
  'COUNSELING',
  'RESEARCH',
  'FINANCIAL',
];

export function isSensitiveClassification(value: DataClassification): boolean {
  return SENSITIVE_CLASSIFICATIONS.includes(value);
}

/* -------------------------------------------------------------------------- */
/* 엔터티                                                                      */
/* -------------------------------------------------------------------------- */

export interface ToolCategory {
  id: CategoryId;
  campusId: CampusId;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ToolTag {
  id: string;
  campusId: CampusId;
  name: string;
}

/**
 * 도구를 어디서 실행하는가 (리뷰 4.1절).
 *
 * "설치해야 하나, 그냥 링크 열면 되나"가 쓸지 말지를 가르는 첫 질문이라 목록에서 바로 보여준다.
 */
export const RUNTIME_KINDS = ['WEB', 'DESKTOP', 'MOBILE', 'SCRIPT', 'OTHER'] as const;

export type RuntimeKind = (typeof RUNTIME_KINDS)[number];

export const RUNTIME_KIND_LABELS: Record<RuntimeKind, string> = {
  WEB: '웹에서 실행',
  DESKTOP: '윈도우 프로그램',
  MOBILE: '모바일 앱',
  SCRIPT: '스크립트·매크로',
  OTHER: '그 밖',
};

export function isRuntimeKind(value: unknown): value is RuntimeKind {
  return typeof value === 'string' && (RUNTIME_KINDS as readonly string[]).includes(value);
}

export const RUNTIME_KIND_DESCRIPTIONS: Record<RuntimeKind, string> = {
  WEB: '주소만 열면 바로 쓸 수 있습니다.',
  DESKTOP: '내 컴퓨터에 설치해야 합니다.',
  MOBILE: '휴대폰에 설치해서 씁니다.',
  SCRIPT: '엑셀 매크로나 실행 파일처럼 파일을 받아 돌립니다.',
  OTHER: '위에 없는 방식입니다.',
};

/** 도구 자체. 자주 바뀌지 않는 식별·소유·상태 정보만 담는다. */
export interface AutomationTool {
  id: ToolId;
  campusId: CampusId;
  name: string;
  summary: string;
  categoryId: CategoryId;
  /** 어디서 실행하는가 */
  runtimeKind: RuntimeKind;
  /**
   * 이 도구가 누구에게 맞는지. 비워 두면 "누구나"로 본다.
   * 부서 대신 쓴다 — 부서로 나누면 옆 부서가 이미 만든 걸 못 찾는다.
   */
  recommendedFor: MemberType[];
  /** 만든 사람 */
  ownerUserId: UserId;
  /** 개발자(복수 가능) */
  developerUserIds: UserId[];
  status: ToolStatus;
  /** 현재 공개 중인 버전. DRAFT 단계에서는 최신 초안을 가리킨다. */
  currentVersionId: ToolVersionId;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: UserId;
  deletedAt: string | null;
}

export interface ToolDataClassificationEntry {
  classification: DataClassification;
  inUse: boolean;
  note: string;
}

export interface ToolSecurityProfile {
  classifications: ToolDataClassificationEntry[];
  /** 외부 API·외부 LLM으로 데이터를 전송하는가 */
  sendsDataExternally: boolean;
  externalTransferTargets: string;
  /** 데이터 저장 위치 (예: 교내 서버 / 국내 클라우드 / 해외 리전) */
  dataStorageLocation: string;
  /** 보관기간. 미설정은 그 자체가 위험 요소다. */
  dataRetentionPeriod: string;
  hasExecutionLog: boolean;
  requiresHumanApproval: boolean;
}

export const ATTACHMENT_KINDS = [
  'COVER_IMAGE',
  'USER_MANUAL',
  'TEST_RESULT',
  'SECURITY_REVIEW',
  'OTHER',
] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  COVER_IMAGE: '대표 이미지',
  USER_MANUAL: '사용 설명서',
  TEST_RESULT: '테스트 결과',
  SECURITY_REVIEW: '개인정보·보안 검토자료',
  OTHER: '기타 자료',
};

export interface ToolAttachment {
  id: AttachmentId;
  toolVersionId: ToolVersionId;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  byteSize: number;
  storagePath: string;
  createdAt: string;
  createdBy: UserId;
}

/**
 * 도구의 상세 내용. 변경 이력을 남기기 위해 버전 단위로 저장한다.
 * 평가는 버전에 붙기 때문에 새 버전이 나오면 평가도 새로 받는다.
 */
export interface AutomationToolVersion {
  id: ToolVersionId;
  toolId: ToolId;
  campusId: CampusId;
  /** 표시용 버전 라벨 (예: v1.0) */
  versionLabel: string;
  /** 이 버전에서 무엇이 바뀌었는지 */
  changeNote: string;

  // 기본정보
  problemStatement: string;

  // 기능정보
  keyFeatures: string[];
  currentWorkflow: string;
  automatedWorkflow: string;
  inputData: string;
  outputData: string;
  expectedUsers: string;
  automationLevel: AutomationLevel;

  // 보안·데이터
  security: ToolSecurityProfile;

  // 링크
  repositoryUrl: string;
  serviceUrl: string;

  createdAt: string;
  updatedAt: string;
  createdBy: UserId;
  deletedAt: string | null;
}

export interface ToolStatusHistoryEntry {
  id: StatusHistoryId;
  toolId: ToolId;
  fromStatus: ToolStatus | null;
  toStatus: ToolStatus;
  changedBy: UserId;
  changedAt: string;
  /** 변경 이유 (필수) */
  reason: string;
  /** 검토 의견 (선택) */
  reviewComment: string;
}

/** 목록 화면에서 쓰는 요약 뷰 */
export interface ToolListItem {
  tool: AutomationTool;
  version: AutomationToolVersion;
  categoryName: string;
  ownerName: string;
  evaluationCount: number;
  /** 실제로 열어 본 횟수. "많이 쓰는 순" 정렬에 쓴다. */
  launchCount: number;
  averageOverallScore: number | null;
  openImprovementCount: number;
}

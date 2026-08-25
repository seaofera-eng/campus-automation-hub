import type {
  CampusId,
  DemandId,
  DemandMatchId,
  ToolId,
  UserId,
} from '../shared/ids';

export const DEMAND_STATUSES = [
  'DRAFT',
  'OPEN',
  'MATCHED',
  'IN_DEVELOPMENT',
  'PILOT',
  'COMPLETED',
  'CLOSED',
] as const;

export type DemandStatus = (typeof DEMAND_STATUSES)[number];

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  DRAFT: '임시저장',
  OPEN: '공개',
  MATCHED: '도구 연결됨',
  IN_DEVELOPMENT: '개발 중',
  PILOT: '시범운영',
  COMPLETED: '완료',
  CLOSED: '종료',
};

export const DEMAND_STATUS_DESCRIPTIONS: Record<DemandStatus, string> = {
  DRAFT: '작성 중입니다. 아직 다른 구성원에게 보이지 않습니다.',
  OPEN: '공개되어 기존 도구 연결이나 개발자 참여를 기다리는 중입니다.',
  MATCHED: '기존 도구와 연결되었습니다.',
  IN_DEVELOPMENT: '개발이 진행되고 있습니다.',
  PILOT: '결과물을 시범 사용해 보는 중입니다.',
  COMPLETED: '수요가 해결되었습니다.',
  CLOSED: '더 이상 진행하지 않습니다.',
};

/** 수요-도구 연결 유형 (요구사항 8번) */
export const MATCH_TYPES = [
  'READY_TO_USE',
  'NEEDS_CONFIGURATION',
  'NEEDS_IMPROVEMENT',
  'NEEDS_COMBINATION',
  'NEEDS_NEW_DEVELOPMENT',
] as const;

export type MatchType = (typeof MATCH_TYPES)[number];

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  READY_TO_USE: '바로 사용 가능',
  NEEDS_CONFIGURATION: '설정 변경 후 사용 가능',
  NEEDS_IMPROVEMENT: '기존 도구 개선 필요',
  NEEDS_COMBINATION: '여러 도구 조합 필요',
  NEEDS_NEW_DEVELOPMENT: '신규 개발 필요',
};

export const WORK_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'SEMESTERLY', 'IRREGULAR'] as const;
export type WorkFrequency = (typeof WORK_FREQUENCIES)[number];

export const WORK_FREQUENCY_LABELS: Record<WorkFrequency, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
  SEMESTERLY: '학기마다',
  IRREGULAR: '비정기',
};

export interface AutomationDemand {
  id: DemandId;
  campusId: CampusId;
  title: string;
  requesterUserId: UserId;

  currentWorkDescription: string;
  mostPainfulStep: string;
  inputMaterials: string;
  desiredOutcome: string;
  workFrequency: WorkFrequency;
  expectedUserCount: number | null;

  /** 이름·학번처럼 사람을 특정할 수 있는 정보를 다루는가 */
  containsIdentifiablePersonalData: boolean;
  /** 통계·집계처럼 사람을 특정할 수 없는 형태의 개인 관련 정보를 다루는가 */
  containsAnonymizedPersonalData: boolean;
  containsAcademicOrResearchData: boolean;
  requiresHumanApproval: boolean;

  requiredFeatures: string[];
  optionalFeatures: string[];
  /** 자동화되면 무엇이 나아지는지 */
  expectedBenefit: string;
  /** 희망 완료시기 (ISO date) */
  desiredCompletionDate: string | null;
  /** 완성한 개발자에게 주고 싶은 토큰. 5단계 토큰 시스템에서 실제로 지급된다. */
  offeredTokens: number | null;

  status: DemandStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: UserId;
  deletedAt: string | null;
}

export interface DemandMatch {
  id: DemandMatchId;
  demandId: DemandId;
  toolId: ToolId;
  matchType: MatchType;
  /** 왜 이렇게 연결했는지 — 사람이 직접 작성한다. AI 점수가 아니다. */
  rationale: string;
  matchedBy: UserId;
  matchedAt: string;
}

export const PARTICIPANT_ROLES = ['DEVELOPER', 'ADVISOR'] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  DEVELOPER: '개발 참여',
  ADVISOR: '자문 참여',
};

export interface DemandParticipant {
  id: string;
  demandId: DemandId;
  userId: UserId;
  participantRole: ParticipantRole;
  /** 어떻게 기여할 수 있는지 */
  message: string;
  joinedAt: string;
}

export interface DemandListItem {
  demand: AutomationDemand;
  requesterName: string;
  matchCount: number;
  participantCount: number;
}

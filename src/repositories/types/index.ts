import type {
  AutomationDemand,
  DemandAttachment,
  DemandComment,
  DemandMatch,
  DemandParticipant,
  DemandStatus,
} from '@/domain/demand/types';
import type {
  DemandAnalysis,
  DuplicateAnalysis,
  RiskAnalysis,
} from '@/domain/analysis/types';
import type { EvaluationHistoryEntry, ToolEvaluation } from '@/domain/evaluation/types';
import type { Campus, Profile } from '@/domain/identity/types';
import type { Notice } from '@/domain/notice/types';
import type { RewardEntry } from '@/domain/reward/types';
import type {
  ImprovementRequest,
  ImprovementRequestHistoryEntry,
  ImprovementStatus,
} from '@/domain/improvement/types';
import type { ActivityEntry, AuditLog, Notification, UsageEvent } from '@/domain/observability/types';
import type { ReviewAssignment, ReviewComment } from '@/domain/review/types';
import type { RiskChecklist } from '@/domain/tool/risk-checklist-rules';
import type {
  AutomationTool,
  AutomationToolVersion,
  DataClassification,
  ToolAttachment,
  ToolCategory,
  ToolStatus,
  ToolStatusHistoryEntry,
} from '@/domain/tool/types';
import type {
  CampusId,
  CategoryId,
  DemandId,
  EvaluationId,
  ImprovementRequestId,
  ToolId,
  ToolVersionId,
  UserId,
} from '@/domain/shared/ids';
import type { Page, PageRequest } from '@/domain/shared/pagination';

/**
 * 저장소 인터페이스.
 *
 * DEMO(파일) 구현과 Supabase 구현이 이 계약을 함께 만족한다.
 * application 계층은 이 인터페이스만 알고, 어떤 구현이 주입되는지는 모른다.
 */

/* -------------------------------------------------------------------------- */
/* 조직 · 사용자                                                               */
/* -------------------------------------------------------------------------- */

export interface IdentityRepository {
  getCampus(id: CampusId): Promise<Campus | null>;
  getDefaultCampus(): Promise<Campus>;


  listProfiles(campusId: CampusId): Promise<Profile[]>;
  getProfile(id: UserId): Promise<Profile | null>;
  getProfileByEmail(email: string): Promise<Profile | null>;
  updateProfile(profile: Profile): Promise<Profile>;
}

/* -------------------------------------------------------------------------- */
/* 도구                                                                        */
/* -------------------------------------------------------------------------- */

export interface ToolQueryFilters {
  campusId: CampusId;
  keyword?: string;
  statuses?: readonly ToolStatus[];
  categoryIds?: readonly CategoryId[];
  dataClassifications?: readonly DataClassification[];
  /** 특정 사용자가 담당자·개발자인 도구만 */
  involvingUserId?: UserId;
  includeDeleted?: boolean;
}

export type ToolSortKey = 'RECENT' | 'POPULAR' | 'EVALUATION' | 'NAME';

export interface ToolRepository {
  listTools(
    filters: ToolQueryFilters,
    sort: ToolSortKey,
    page: PageRequest,
  ): Promise<Page<AutomationTool>>;
  countByStatus(campusId: CampusId): Promise<Record<ToolStatus, number>>;
  getTool(id: ToolId): Promise<AutomationTool | null>;
  getToolByName(campusId: CampusId, name: string): Promise<AutomationTool | null>;
  insertTool(tool: AutomationTool): Promise<AutomationTool>;
  updateTool(tool: AutomationTool): Promise<AutomationTool>;

  getVersion(id: ToolVersionId): Promise<AutomationToolVersion | null>;
  listVersions(toolId: ToolId): Promise<AutomationToolVersion[]>;
  insertVersion(version: AutomationToolVersion): Promise<AutomationToolVersion>;
  updateVersion(version: AutomationToolVersion): Promise<AutomationToolVersion>;

  listStatusHistory(toolId: ToolId): Promise<ToolStatusHistoryEntry[]>;
  insertStatusHistory(entry: ToolStatusHistoryEntry): Promise<ToolStatusHistoryEntry>;

  listAttachments(toolVersionId: ToolVersionId): Promise<ToolAttachment[]>;
  insertAttachment(attachment: ToolAttachment): Promise<ToolAttachment>;
  deleteAttachment(id: string): Promise<void>;
}

export interface ReferenceDataRepository {
  listCategories(campusId: CampusId): Promise<ToolCategory[]>;
  getCategory(id: CategoryId): Promise<ToolCategory | null>;
  upsertCategory(category: ToolCategory): Promise<ToolCategory>;
}

/* -------------------------------------------------------------------------- */
/* 검토                                                                        */
/* -------------------------------------------------------------------------- */

export interface ReviewRepository {
  listAssignments(campusId: CampusId, reviewerUserId?: UserId): Promise<ReviewAssignment[]>;
  getAssignmentForVersion(toolVersionId: ToolVersionId): Promise<ReviewAssignment | null>;
  upsertAssignment(assignment: ReviewAssignment): Promise<ReviewAssignment>;

  listComments(toolId: ToolId): Promise<ReviewComment[]>;
  insertComment(comment: ReviewComment): Promise<ReviewComment>;

  getChecklist(toolVersionId: ToolVersionId): Promise<RiskChecklist | null>;
  upsertChecklist(checklist: RiskChecklist): Promise<RiskChecklist>;
}

/* -------------------------------------------------------------------------- */
/* 수요                                                                        */
/* -------------------------------------------------------------------------- */

export interface DemandQueryFilters {
  campusId: CampusId;
  keyword?: string;
  statuses?: readonly DemandStatus[];
  requesterUserId?: UserId;
}

export interface DemandRepository {
  listDemands(filters: DemandQueryFilters, page: PageRequest): Promise<Page<AutomationDemand>>;
  countByStatus(campusId: CampusId): Promise<Record<DemandStatus, number>>;
  getDemand(id: DemandId): Promise<AutomationDemand | null>;
  insertDemand(demand: AutomationDemand): Promise<AutomationDemand>;
  updateDemand(demand: AutomationDemand): Promise<AutomationDemand>;

  listMatches(demandId: DemandId): Promise<DemandMatch[]>;
  listMatchesForTool(toolId: ToolId): Promise<DemandMatch[]>;
  insertMatch(match: DemandMatch): Promise<DemandMatch>;
  deleteMatch(id: string): Promise<void>;

  listParticipants(demandId: DemandId): Promise<DemandParticipant[]>;
  insertParticipant(participant: DemandParticipant): Promise<DemandParticipant>;

  /** 참여 신청과 별개로 남기는 문의 (리뷰 6.4절) */
  listComments(demandId: DemandId): Promise<DemandComment[]>;
  insertComment(comment: DemandComment): Promise<DemandComment>;
  softDeleteComment(id: string, at: string): Promise<void>;

  listAttachments(demandId: DemandId): Promise<DemandAttachment[]>;
  insertAttachment(attachment: DemandAttachment): Promise<DemandAttachment>;
  deleteAttachment(id: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 토큰                                                                        */
/* -------------------------------------------------------------------------- */

export interface RewardRepository {
  /**
   * 한 사람이 받은 기록 전부. 잔액은 도메인의 `sumBalance()` 가 계산한다.
   * 저장소는 기록만 돌려준다 — 계산 규칙이 두 곳에 있으면 어긋난다.
   */
  listByUser(userId: UserId): Promise<RewardEntry[]>;
  /** 이 수요에 이미 수여했는지 확인한다. 한 수요에 한 번만 준다. */
  findAwardForDemand(demandId: DemandId): Promise<RewardEntry | null>;
  /** append-only. 수정·삭제 메서드를 두지 않는다. */
  insert(entry: RewardEntry): Promise<RewardEntry>;
}

/* -------------------------------------------------------------------------- */
/* 공지                                                                        */
/* -------------------------------------------------------------------------- */

export interface NoticeRepository {
  list(campusId: CampusId, includeUnpublished: boolean): Promise<Notice[]>;
  get(id: string): Promise<Notice | null>;
  upsert(notice: Notice): Promise<Notice>;
}

/* -------------------------------------------------------------------------- */
/* 평가                                                                        */
/* -------------------------------------------------------------------------- */

export interface EvaluationRepository {
  listByTool(toolId: ToolId): Promise<ToolEvaluation[]>;
  listByUser(userId: UserId): Promise<ToolEvaluation[]>;
  countAll(campusId: CampusId): Promise<number>;
  getById(id: EvaluationId): Promise<ToolEvaluation | null>;
  /** 요구사항 9번: 같은 사용자가 같은 버전에 중복 평가하지 못하게 하는 조회 */
  findByUserAndVersion(userId: UserId, toolVersionId: ToolVersionId): Promise<ToolEvaluation | null>;
  insert(evaluation: ToolEvaluation): Promise<ToolEvaluation>;
  update(evaluation: ToolEvaluation): Promise<ToolEvaluation>;

  listHistory(evaluationId: EvaluationId): Promise<EvaluationHistoryEntry[]>;
  insertHistory(entry: EvaluationHistoryEntry): Promise<EvaluationHistoryEntry>;
}

/* -------------------------------------------------------------------------- */
/* 개선 요청                                                                   */
/* -------------------------------------------------------------------------- */

export interface ImprovementQueryFilters {
  campusId: CampusId;
  keyword?: string;
  statuses?: readonly ImprovementStatus[];
  toolId?: ToolId;
  assigneeUserId?: UserId;
  requesterUserId?: UserId;
}

export interface ImprovementRepository {
  list(filters: ImprovementQueryFilters, page: PageRequest): Promise<Page<ImprovementRequest>>;
  listByTool(toolId: ToolId): Promise<ImprovementRequest[]>;
  countByStatus(campusId: CampusId): Promise<Record<ImprovementStatus, number>>;
  getById(id: ImprovementRequestId): Promise<ImprovementRequest | null>;
  insert(request: ImprovementRequest): Promise<ImprovementRequest>;
  update(request: ImprovementRequest): Promise<ImprovementRequest>;

  listHistory(id: ImprovementRequestId): Promise<ImprovementRequestHistoryEntry[]>;
  insertHistory(entry: ImprovementRequestHistoryEntry): Promise<ImprovementRequestHistoryEntry>;
}

/* -------------------------------------------------------------------------- */
/* 감사 · 알림 · 사용현황                                                       */
/* -------------------------------------------------------------------------- */

export interface AuditLogFilters {
  campusId: CampusId;
  action?: string;
  actorUserId?: UserId;
  targetType?: string;
  from?: string;
  to?: string;
}

export interface ObservabilityRepository {
  insertAuditLog(log: AuditLog): Promise<AuditLog>;
  listAuditLogs(filters: AuditLogFilters, page: PageRequest): Promise<Page<AuditLog>>;

  insertUsageEvent(event: UsageEvent): Promise<void>;
  countUsageByTool(toolId: ToolId): Promise<{ views: number; launches: number }>;

  listNotifications(userId: UserId, onlyUnread: boolean): Promise<Notification[]>;
  insertNotification(notification: Notification): Promise<Notification>;
  markNotificationRead(id: string, at: string): Promise<void>;
  markAllNotificationsRead(userId: UserId, at: string): Promise<void>;

  listRecentActivity(campusId: CampusId, limit: number): Promise<ActivityEntry[]>;
}

/* -------------------------------------------------------------------------- */
/* AI 분석 결과                                                                */
/* -------------------------------------------------------------------------- */

/**
 * 모델이 낸 분석을 담아 두는 곳.
 *
 * 도구 버전 하나에 분석 하나다. 새 버전이 올라오면 그 버전으로 다시 분석한다.
 * 이전 버전의 분석은 그 버전에 그대로 남아 있어서, 나중에 "그때는 뭐라고 봤나"를
 * 되짚을 수 있다.
 */
export interface AnalysisRepository {
  getDuplicateAnalysis(toolVersionId: ToolVersionId): Promise<DuplicateAnalysis | null>;
  listDuplicateAnalyses(campusId: CampusId): Promise<DuplicateAnalysis[]>;
  upsertDuplicateAnalysis(analysis: DuplicateAnalysis): Promise<DuplicateAnalysis>;

  getRiskAnalysis(toolVersionId: ToolVersionId): Promise<RiskAnalysis | null>;
  upsertRiskAnalysis(analysis: RiskAnalysis): Promise<RiskAnalysis>;

  getDemandAnalysis(demandId: DemandId): Promise<DemandAnalysis | null>;
  upsertDemandAnalysis(analysis: DemandAnalysis): Promise<DemandAnalysis>;
}

/* -------------------------------------------------------------------------- */
/* 첨부파일 저장소                                                             */
/* -------------------------------------------------------------------------- */

export interface FileStorage {
  /** 저장 후 내부 경로를 돌려준다. */
  save(path: string, data: Uint8Array, contentType: string): Promise<string>;
  /** 브라우저에서 열 수 있는 URL. DEMO 모드에서는 앱 내부 라우트를 돌려준다. */
  getUrl(path: string): Promise<string>;
  remove(path: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* 통합 컨테이너                                                               */
/* -------------------------------------------------------------------------- */

export interface Repositories {
  identity: IdentityRepository;
  tools: ToolRepository;
  reference: ReferenceDataRepository;
  reviews: ReviewRepository;
  demands: DemandRepository;
  evaluations: EvaluationRepository;
  improvements: ImprovementRepository;
  observability: ObservabilityRepository;
  analyses: AnalysisRepository;
  rewards: RewardRepository;
  notices: NoticeRepository;
  files: FileStorage;
}

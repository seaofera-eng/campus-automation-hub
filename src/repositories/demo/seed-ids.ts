import { asId } from '@/domain/shared/ids';
import type {
  CampusId,
  CategoryId,
  DemandId,
  IntegrationSystemId,
  ToolId,
  ToolVersionId,
  UserId,
} from '@/domain/shared/ids';

/**
 * 데모 데이터의 고정 식별자.
 *
 * 값을 고정해 두면 E2E 테스트와 문서에서 특정 레코드를 안정적으로 가리킬 수 있다.
 * UUID v4 형식이라 Supabase uuid 컬럼에도 그대로 넣을 수 있다.
 */
function uuid(group: number, index: number): string {
  const g = group.toString(16).padStart(4, '0');
  const i = index.toString(16).padStart(12, '0');
  return `0000${g}-0000-4000-8000-${i}`;
}

export const DEMO_CAMPUS_ID = asId<CampusId>(uuid(1, 1));

export const DEMO_USER_IDS = {
  developer: asId<UserId>(uuid(3, 1)),
  reviewer: asId<UserId>(uuid(3, 2)),
  requester: asId<UserId>(uuid(3, 3)),
  admin: asId<UserId>(uuid(3, 4)),
  developer2: asId<UserId>(uuid(3, 5)),
  requester2: asId<UserId>(uuid(3, 6)),
} as const;

export const DEMO_CATEGORY_IDS = {
  documentMeeting: asId<CategoryId>(uuid(4, 1)),
  dataAggregation: asId<CategoryId>(uuid(4, 2)),
  communication: asId<CategoryId>(uuid(4, 3)),
  informationSearch: asId<CategoryId>(uuid(4, 4)),
  classificationRouting: asId<CategoryId>(uuid(4, 5)),
  researchSupport: asId<CategoryId>(uuid(4, 6)),
} as const;

export const DEMO_INTEGRATION_IDS = {
  email: asId<IntegrationSystemId>(uuid(5, 1)),
  calendar: asId<IntegrationSystemId>(uuid(5, 2)),
  lms: asId<IntegrationSystemId>(uuid(5, 3)),
  academicSystem: asId<IntegrationSystemId>(uuid(5, 4)),
  researchSystem: asId<IntegrationSystemId>(uuid(5, 5)),
  approvalSystem: asId<IntegrationSystemId>(uuid(5, 6)),
  fileStorage: asId<IntegrationSystemId>(uuid(5, 7)),
  externalApi: asId<IntegrationSystemId>(uuid(5, 8)),
} as const;

export const DEMO_TOOL_IDS = {
  meetingNotes: asId<ToolId>(uuid(6, 1)),
  excelAggregation: asId<ToolId>(uuid(6, 2)),
  repetitiveEmail: asId<ToolId>(uuid(6, 3)),
  grantSummary: asId<ToolId>(uuid(6, 4)),
  regulationChatbot: asId<ToolId>(uuid(6, 5)),
  inquiryClassifier: asId<ToolId>(uuid(6, 6)),
} as const;

export const DEMO_VERSION_IDS = {
  meetingNotes: asId<ToolVersionId>(uuid(7, 1)),
  excelAggregation: asId<ToolVersionId>(uuid(7, 2)),
  repetitiveEmail: asId<ToolVersionId>(uuid(7, 3)),
  grantSummary: asId<ToolVersionId>(uuid(7, 4)),
  regulationChatbot: asId<ToolVersionId>(uuid(7, 5)),
  inquiryClassifier: asId<ToolVersionId>(uuid(7, 6)),
} as const;

export const DEMO_DEMAND_IDS = {
  meetingTasks: asId<DemandId>(uuid(8, 1)),
  departmentReports: asId<DemandId>(uuid(8, 2)),
  grantAlerts: asId<DemandId>(uuid(8, 3)),
  complaintRouting: asId<DemandId>(uuid(8, 4)),
} as const;

/** 다른 시드 레코드(평가·개선요청·이력 등)의 ID 생성기 */
export function seedId(group: number, index: number): string {
  return uuid(group, index);
}

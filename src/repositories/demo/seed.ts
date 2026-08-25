import type { AutomationDemand, DemandMatch, DemandParticipant } from '@/domain/demand/types';
import type { ToolEvaluation } from '@/domain/evaluation/types';
import type { Campus, Department, Profile } from '@/domain/identity/types';
import type { ImprovementRequest } from '@/domain/improvement/types';
import type { ReviewAssignment, ReviewComment } from '@/domain/review/types';
import { asId } from '@/domain/shared/ids';
import type { AuditLog } from '@/domain/observability/types';
import type {
  AuditLogId,
  DemandMatchId,
  EvaluationId,
  ImprovementRequestId,
  ReviewAssignmentId,
  ReviewCommentId,
  RiskChecklistId,
  StatusHistoryId,
  ToolVersionId,
  UserId,
} from '@/domain/shared/ids';
import type { RiskChecklist } from '@/domain/tool/risk-checklist-rules';
import { emptyChecklistItems } from '@/domain/tool/risk-checklist-rules';
import type {
  AutomationTool,
  AutomationToolVersion,
  IntegrationSystem,
  ToolCategory,
  ToolDataClassificationEntry,
  ToolStatus,
  ToolStatusHistoryEntry,
} from '@/domain/tool/types';
import { DATA_CLASSIFICATIONS } from '@/domain/tool/types';
import type { DemoDatabase } from './store';
import { DEMO_SCHEMA_VERSION } from './store';
import {
  DEMO_CAMPUS_ID,
  DEMO_CATEGORY_IDS,
  DEMO_DEMAND_IDS,
  DEMO_DEPARTMENT_IDS,
  DEMO_INTEGRATION_IDS,
  DEMO_TOOL_IDS,
  DEMO_USER_IDS,
  DEMO_VERSION_IDS,
  seedId,
} from './seed-ids';

/**
 * DEMO 모드 시드 데이터.
 *
 * ⚠️ 여기의 모든 내용은 **가상의 예시 데이터**다.
 * 실존하는 대학·부서·구성원과 무관하며, 개인정보는 하나도 들어 있지 않다.
 * 도구명과 수요 제목에 `[예시]` 접두어를 붙여 화면 어디에서도 실제 데이터와
 * 혼동되지 않게 한다 (요구사항 20번).
 */

/** 시드 기준 시각. 상대적인 날짜를 만들 때 기준으로 쓴다. */
const NOW = new Date();

function daysAgo(days: number): string {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysAhead(days: number): string {
  const date = new Date(NOW);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 데모 데이터임을 이름 자체에 남긴다. */
const DEMO_PREFIX = '[예시]';

/* -------------------------------------------------------------------------- */
/* 조직                                                                        */
/* -------------------------------------------------------------------------- */

function buildCampus(): Campus {
  return {
    id: DEMO_CAMPUS_ID,
    name: '가상 예시대학교',
    shortName: '예시대',
    createdAt: daysAgo(400),
  };
}

function buildDepartments(): Department[] {
  const rows: { id: Department['id']; name: string; code: string; sortOrder: number }[] = [
    { id: DEMO_DEPARTMENT_IDS.academicAffairs, name: '학사관리과', code: 'ACAD', sortOrder: 1 },
    { id: DEMO_DEPARTMENT_IDS.researchSupport, name: '연구지원과', code: 'RSCH', sortOrder: 2 },
    { id: DEMO_DEPARTMENT_IDS.industryCooperation, name: '산학협력단', code: 'INDU', sortOrder: 3 },
    { id: DEMO_DEPARTMENT_IDS.studentCounseling, name: '학생상담센터', code: 'CNSL', sortOrder: 4 },
    { id: DEMO_DEPARTMENT_IDS.informationCenter, name: '정보화본부', code: 'INFO', sortOrder: 5 },
    {
      id: DEMO_DEPARTMENT_IDS.sharedUniversity,
      name: '공유대학운영센터',
      code: 'SHRD',
      sortOrder: 6,
    },
  ];

  return rows.map((row) => ({
    ...row,
    campusId: DEMO_CAMPUS_ID,
    parentId: null,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(400),
    deletedAt: null,
  }));
}

/**
 * 데모 계정.
 *
 * 이메일 도메인으로 `demo.university.test` 를 쓴다. `.test` 는 RFC 2606 이
 * 테스트 용도로 예약한 TLD 라서 실제로 존재할 수 없다.
 * 비밀번호는 화면에 안내되며 데모 전용이다 (요구사항 18번: 데모/운영 계정 구분).
 */
function buildProfiles(): Profile[] {
  const rows: {
    id: UserId;
    email: string;
    name: string;
    title: string;
    role: Profile['role'];
    departmentId: Department['id'];
  }[] = [
    {
      id: DEMO_USER_IDS.developer,
      email: 'developer@demo.university.test',
      name: '김개발',
      title: '주무관',
      role: 'DEVELOPER',
      departmentId: DEMO_DEPARTMENT_IDS.informationCenter,
    },
    {
      id: DEMO_USER_IDS.reviewer,
      email: 'reviewer@demo.university.test',
      name: '이검토',
      title: '팀장',
      role: 'REVIEWER',
      departmentId: DEMO_DEPARTMENT_IDS.informationCenter,
    },
    {
      id: DEMO_USER_IDS.requester,
      email: 'requester@demo.university.test',
      name: '박수요',
      title: '주무관',
      role: 'REQUESTER',
      departmentId: DEMO_DEPARTMENT_IDS.academicAffairs,
    },
    {
      id: DEMO_USER_IDS.admin,
      email: 'admin@demo.university.test',
      name: '최관리',
      title: '과장',
      role: 'ADMIN',
      departmentId: DEMO_DEPARTMENT_IDS.informationCenter,
    },
    {
      id: DEMO_USER_IDS.developer2,
      email: 'developer2@demo.university.test',
      name: '정연구',
      title: '연구원',
      role: 'DEVELOPER',
      departmentId: DEMO_DEPARTMENT_IDS.researchSupport,
    },
    {
      id: DEMO_USER_IDS.requester2,
      email: 'requester2@demo.university.test',
      name: '한상담',
      title: '상담사',
      role: 'REQUESTER',
      departmentId: DEMO_DEPARTMENT_IDS.studentCounseling,
    },
  ];

  return rows.map((row) => ({
    ...row,
    campusId: DEMO_CAMPUS_ID,
    isActive: true,
    isDemoAccount: true,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(300),
    deletedAt: null,
  }));
}

/* -------------------------------------------------------------------------- */
/* 참조 데이터                                                                 */
/* -------------------------------------------------------------------------- */

function buildCategories(): ToolCategory[] {
  const rows: { id: ToolCategory['id']; code: string; name: string; description: string }[] = [
    {
      id: DEMO_CATEGORY_IDS.documentMeeting,
      code: 'DOC_MEETING',
      name: '문서·회의',
      description: '회의록, 보고서, 공문 등 문서 작성과 정리를 돕는 도구',
    },
    {
      id: DEMO_CATEGORY_IDS.dataAggregation,
      code: 'DATA_AGG',
      name: '데이터 취합',
      description: '여러 부서·학과의 자료를 모으고 정리하는 도구',
    },
    {
      id: DEMO_CATEGORY_IDS.communication,
      code: 'COMM',
      name: '커뮤니케이션',
      description: '이메일, 안내문, 공지 작성과 발송을 돕는 도구',
    },
    {
      id: DEMO_CATEGORY_IDS.informationSearch,
      code: 'SEARCH',
      name: '정보 검색',
      description: '규정, 지침, 자료를 찾아주는 검색·질의응답 도구',
    },
    {
      id: DEMO_CATEGORY_IDS.classificationRouting,
      code: 'ROUTING',
      name: '분류·라우팅',
      description: '문의나 민원을 분류해 담당 부서로 전달하는 도구',
    },
    {
      id: DEMO_CATEGORY_IDS.researchSupport,
      code: 'RESEARCH',
      name: '연구지원',
      description: '연구과제 공고, 연구비, 실적 관리를 돕는 도구',
    },
  ];

  return rows.map((row, index) => ({
    ...row,
    campusId: DEMO_CAMPUS_ID,
    sortOrder: index + 1,
    isActive: true,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(400),
  }));
}

function buildIntegrationSystems(): IntegrationSystem[] {
  const rows: {
    id: IntegrationSystem['id'];
    code: string;
    name: string;
    isExternal: boolean;
  }[] = [
    { id: DEMO_INTEGRATION_IDS.email, code: 'EMAIL', name: '이메일', isExternal: false },
    { id: DEMO_INTEGRATION_IDS.calendar, code: 'CALENDAR', name: '캘린더', isExternal: false },
    { id: DEMO_INTEGRATION_IDS.lms, code: 'LMS', name: 'LMS', isExternal: false },
    {
      id: DEMO_INTEGRATION_IDS.academicSystem,
      code: 'ACADEMIC',
      name: '학사정보시스템',
      isExternal: false,
    },
    {
      id: DEMO_INTEGRATION_IDS.researchSystem,
      code: 'RESEARCH_MGMT',
      name: '연구관리시스템',
      isExternal: false,
    },
    {
      id: DEMO_INTEGRATION_IDS.approvalSystem,
      code: 'APPROVAL',
      name: '전자결재',
      isExternal: false,
    },
    {
      id: DEMO_INTEGRATION_IDS.fileStorage,
      code: 'FILE_STORAGE',
      name: '파일 저장소',
      isExternal: false,
    },
    { id: DEMO_INTEGRATION_IDS.externalApi, code: 'EXTERNAL_API', name: '외부 API', isExternal: true },
  ];

  return rows.map((row, index) => ({
    ...row,
    campusId: DEMO_CAMPUS_ID,
    sortOrder: index + 1,
    isActive: true,
  }));
}

/* -------------------------------------------------------------------------- */
/* 도구                                                                        */
/* -------------------------------------------------------------------------- */

/** 사용 중인 분류만 켜고 나머지는 끈 상태로 8종 전체 항목을 만든다. */
function classifications(
  inUse: Partial<Record<ToolDataClassificationEntry['classification'], string>>,
): ToolDataClassificationEntry[] {
  return DATA_CLASSIFICATIONS.map((classification) => ({
    classification,
    inUse: classification in inUse,
    note: inUse[classification] ?? '',
  }));
}

interface SeedToolInput {
  id: AutomationTool['id'];
  versionId: ToolVersionId;
  name: string;
  summary: string;
  categoryId: AutomationTool['categoryId'];
  departmentId: Department['id'];
  ownerUserId: UserId;
  developerUserIds: UserId[];
  status: ToolStatus;
  tags: string[];
  createdDaysAgo: number;
  version: Omit<
    AutomationToolVersion,
    'id' | 'toolId' | 'campusId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'deletedAt'
  >;
}

function buildToolSeeds(): SeedToolInput[] {
  return [
    {
      id: DEMO_TOOL_IDS.meetingNotes,
      versionId: DEMO_VERSION_IDS.meetingNotes,
      name: `${DEMO_PREFIX} AI 회의록 정리 도구`,
      summary: '회의 녹취록을 요약하고 담당자별 할 일로 정리해 줍니다.',
      categoryId: DEMO_CATEGORY_IDS.documentMeeting,
      departmentId: DEMO_DEPARTMENT_IDS.informationCenter,
      ownerUserId: DEMO_USER_IDS.developer,
      developerUserIds: [DEMO_USER_IDS.developer],
      status: 'APPROVED',
      tags: ['회의록', '요약', '과업정리'],
      createdDaysAgo: 180,
      version: {
        versionLabel: 'v1.2',
        changeNote: '담당자 자동 인식 정확도 개선 및 회의록 서식 정리',
        description:
          '부서 회의 녹취록이나 메모를 붙여넣으면 안건별 요약과 결정사항, 담당자별 후속 과업 목록을 만들어 줍니다. 결과는 초안으로 제공되며 작성자가 확인·수정한 뒤 배포합니다.',
        problemStatement:
          '회의가 끝난 뒤 회의록을 정리하는 데 매번 40분 이상 걸리고, 담당자별 후속 과업이 누락되는 일이 잦았습니다.',
        keyFeatures: [
          '안건별 논의 내용 요약',
          '결정사항과 보류사항 구분',
          '담당자별 후속 과업 목록 추출',
          '회의록 서식(내부 표준) 자동 적용',
        ],
        currentWorkflow:
          '회의 진행 → 담당자가 메모 정리 → 워드 서식에 옮겨 적기 → 담당자별 과업 수동 정리 → 이메일 배포',
        automatedWorkflow:
          '회의 진행 → 녹취록/메모 붙여넣기 → 요약·과업 초안 자동 생성 → 작성자 확인 및 수정 → 이메일 배포',
        inputData: '회의 녹취록 텍스트, 참석자 명단, 회의 안건',
        outputData: '요약 회의록(서식 적용), 담당자별 후속 과업 목록',
        expectedUsers: '각 부서 회의록 작성 담당자',
        monthlyExpectedUsage: 120,
        automationLevel: 'HUMAN_IN_THE_LOOP',
        integrations: [
          { integrationSystemId: DEMO_INTEGRATION_IDS.email, note: '완성된 회의록 발송' },
          {
            integrationSystemId: DEMO_INTEGRATION_IDS.fileStorage,
            note: '회의록 원본 보관 (교내 저장소)',
          },
        ],
        otherIntegrationNote: '',
        security: {
          classifications: classifications({
            INTERNAL: '회의 안건과 논의 내용',
            PERSONAL: '참석자 이름과 소속 (연락처는 처리하지 않음)',
          }),
          sendsDataExternally: false,
          externalTransferTargets: '',
          dataStorageLocation: '교내 서버 (정보화본부 관리)',
          dataRetentionPeriod: '90일 후 자동 삭제',
          hasExecutionLog: true,
          requiresHumanApproval: true,
        },
        cost: {
          initialDevelopmentCost: 3_000_000,
          monthlyOperationCost: 50_000,
          monthlyLlmCost: 120_000,
          externalServiceCost: 0,
          costPerUser: 4_000,
          costBasis: '월 120회 처리 기준, 회당 평균 토큰 사용량으로 산출한 예상치입니다.',
        },
        performance: {
          currentProcessingMinutes: 45,
          automatedProcessingMinutes: 12,
          monthlySavedHours: 66,
          errorReductionNote: '후속 과업 누락이 눈에 띄게 줄었다는 사용 부서 의견이 있었습니다.',
          expectedBenefit: '회의록 작성 시간을 줄이고 후속 과업 관리 누락을 방지합니다.',
          measurementMethod: '작성 소요시간 자가 기록, 월별 사용 건수 집계',
        },
        repositoryUrl: 'https://example.test/demo/meeting-notes',
        serviceUrl: 'https://example.test/demo/meeting-notes/app',
      },
    },
    {
      id: DEMO_TOOL_IDS.excelAggregation,
      versionId: DEMO_VERSION_IDS.excelAggregation,
      name: `${DEMO_PREFIX} 학과별 엑셀 취합 자동화`,
      summary: '학과에서 제출한 엑셀 파일을 하나의 표로 합치고 오류를 점검합니다.',
      categoryId: DEMO_CATEGORY_IDS.dataAggregation,
      departmentId: DEMO_DEPARTMENT_IDS.academicAffairs,
      ownerUserId: DEMO_USER_IDS.developer,
      developerUserIds: [DEMO_USER_IDS.developer, DEMO_USER_IDS.developer2],
      status: 'APPROVED',
      tags: ['엑셀', '취합', '검증'],
      createdDaysAgo: 150,
      version: {
        versionLabel: 'v2.0',
        changeNote: '서식이 다른 파일도 열 이름 매칭으로 처리하도록 개선',
        description:
          '학과별로 제출한 엑셀 파일을 표준 서식으로 변환해 하나의 표로 합칩니다. 필수 항목 누락, 중복 행, 숫자 형식 오류를 점검해 목록으로 알려 줍니다.',
        problemStatement:
          '학과마다 서식이 조금씩 달라 취합 담당자가 수작업으로 열을 맞추고 오류를 찾느라 제출 기간마다 이틀이 걸렸습니다.',
        keyFeatures: [
          '서로 다른 엑셀 서식을 표준 서식으로 변환',
          '필수 항목 누락 검사',
          '중복 행과 숫자 형식 오류 검출',
          '취합 결과와 오류 목록 동시 출력',
        ],
        currentWorkflow:
          '학과별 파일 수집 → 서식 수동 정리 → 복사·붙여넣기로 취합 → 눈으로 오류 확인 → 재요청',
        automatedWorkflow:
          '학과별 파일 업로드 → 자동 변환·취합 → 오류 목록 확인 → 담당자가 재요청 대상 판단 → 최종 파일 확정',
        inputData: '학과별 제출 엑셀 파일',
        outputData: '통합 엑셀 파일, 오류·누락 항목 목록',
        expectedUsers: '학사관리과, 각 단과대학 행정실',
        monthlyExpectedUsage: 40,
        automationLevel: 'HUMAN_IN_THE_LOOP',
        integrations: [
          {
            integrationSystemId: DEMO_INTEGRATION_IDS.fileStorage,
            note: '제출 파일과 결과 파일 보관',
          },
          { integrationSystemId: DEMO_INTEGRATION_IDS.email, note: '재요청 안내 메일 초안 생성' },
        ],
        otherIntegrationNote: '',
        security: {
          classifications: classifications({
            INTERNAL: '학과 제출 실적 자료',
            ACADEMIC: '교과목 및 이수 관련 통계',
          }),
          sendsDataExternally: false,
          externalTransferTargets: '',
          dataStorageLocation: '교내 파일 저장소',
          dataRetentionPeriod: '학기 종료 후 1년',
          hasExecutionLog: true,
          requiresHumanApproval: true,
        },
        cost: {
          initialDevelopmentCost: 2_000_000,
          monthlyOperationCost: 30_000,
          monthlyLlmCost: 0,
          externalServiceCost: 0,
          costPerUser: 1_500,
          costBasis: 'LLM을 사용하지 않는 규칙 기반 처리라 운영비만 발생합니다.',
        },
        performance: {
          currentProcessingMinutes: 960,
          automatedProcessingMinutes: 90,
          monthlySavedHours: 29,
          errorReductionNote: '제출 오류로 인한 재요청 횟수가 줄었습니다.',
          expectedBenefit: '제출 기간의 취합 업무 부담을 크게 줄입니다.',
          measurementMethod: '취합 소요시간 기록, 재요청 건수 비교',
        },
        repositoryUrl: 'https://example.test/demo/excel-aggregation',
        serviceUrl: 'https://example.test/demo/excel-aggregation/app',
      },
    },
    {
      id: DEMO_TOOL_IDS.repetitiveEmail,
      versionId: DEMO_VERSION_IDS.repetitiveEmail,
      name: `${DEMO_PREFIX} 반복 이메일 작성 도구`,
      summary: '자주 보내는 안내 메일의 초안을 상황에 맞게 만들어 줍니다.',
      categoryId: DEMO_CATEGORY_IDS.communication,
      departmentId: DEMO_DEPARTMENT_IDS.academicAffairs,
      ownerUserId: DEMO_USER_IDS.developer,
      developerUserIds: [DEMO_USER_IDS.developer],
      status: 'PILOT',
      tags: ['이메일', '안내문', '초안'],
      createdDaysAgo: 60,
      version: {
        versionLabel: 'v0.9',
        changeNote: '시범운영용 초기 버전',
        description:
          '수강신청 안내, 서류 제출 요청처럼 반복되는 이메일의 초안을 만들어 줍니다. 발송은 담당자가 내용을 확인한 뒤 직접 수행합니다.',
        problemStatement:
          '같은 성격의 안내 메일을 매번 새로 쓰느라 시간이 들고, 담당자마다 표현이 달라 안내가 일관되지 않았습니다.',
        keyFeatures: [
          '상황별 이메일 초안 생성',
          '교내 표준 문구 반영',
          '대상자 구분에 따른 문구 조정',
        ],
        currentWorkflow: '이전 메일 찾아보기 → 복사 후 수정 → 검토 → 발송',
        automatedWorkflow: '상황 선택 및 조건 입력 → 초안 생성 → 담당자 수정·확인 → 직접 발송',
        inputData: '안내 목적, 대상자 구분, 마감일 등 조건',
        outputData: '이메일 제목과 본문 초안',
        expectedUsers: '학사관리과 안내 담당자',
        monthlyExpectedUsage: 200,
        automationLevel: 'AI_ASSISTED',
        integrations: [
          { integrationSystemId: DEMO_INTEGRATION_IDS.email, note: '초안을 임시보관함에 저장' },
          {
            integrationSystemId: DEMO_INTEGRATION_IDS.externalApi,
            note: '문장 생성을 위한 외부 LLM API 호출',
          },
        ],
        otherIntegrationNote: '',
        security: {
          classifications: classifications({
            PUBLIC: '공개 안내 문구',
            INTERNAL: '내부 일정과 마감일',
          }),
          sendsDataExternally: true,
          externalTransferTargets: '외부 LLM API (안내 문구 생성 목적, 개인정보 미포함)',
          dataStorageLocation: '교내 서버 (초안만 임시 저장)',
          dataRetentionPeriod: '30일',
          hasExecutionLog: true,
          requiresHumanApproval: true,
        },
        cost: {
          initialDevelopmentCost: 1_200_000,
          monthlyOperationCost: 20_000,
          monthlyLlmCost: 80_000,
          externalServiceCost: 0,
          costPerUser: 2_000,
          costBasis: '월 200건 생성 기준 예상치입니다. 시범운영 결과에 따라 조정합니다.',
        },
        performance: {
          currentProcessingMinutes: 15,
          automatedProcessingMinutes: 5,
          monthlySavedHours: 33,
          errorReductionNote: '안내 문구가 통일되어 문의 재확인이 줄어들 것으로 예상합니다.',
          expectedBenefit: '반복 작성 시간을 줄이고 안내 표현을 통일합니다.',
          measurementMethod: '작성 시간 기록, 사용 건수 집계',
        },
        repositoryUrl: 'https://example.test/demo/email-drafts',
        serviceUrl: '',
      },
    },
    {
      id: DEMO_TOOL_IDS.grantSummary,
      versionId: DEMO_VERSION_IDS.grantSummary,
      name: `${DEMO_PREFIX} 연구과제 공고 요약 서비스`,
      summary: '연구과제 공고문을 핵심 조건 중심으로 요약해 제공합니다.',
      categoryId: DEMO_CATEGORY_IDS.researchSupport,
      departmentId: DEMO_DEPARTMENT_IDS.researchSupport,
      ownerUserId: DEMO_USER_IDS.developer2,
      developerUserIds: [DEMO_USER_IDS.developer2],
      status: 'HUMAN_REVIEW',
      tags: ['연구과제', '공고', '요약'],
      createdDaysAgo: 20,
      version: {
        versionLabel: 'v0.5',
        changeNote: '등록 신청용 초기 버전',
        description:
          '기관별 연구과제 공고문에서 지원자격, 지원규모, 접수기한, 제출서류를 뽑아 표로 정리합니다. 원문 링크를 항상 함께 제공합니다.',
        problemStatement:
          '공고문이 기관마다 형식이 달라 연구자들이 핵심 조건을 찾는 데 시간이 걸리고, 마감을 놓치는 사례가 있었습니다.',
        keyFeatures: [
          '지원자격·지원규모·접수기한 추출',
          '제출서류 목록 정리',
          '원문 링크 병기',
          '연구 분야별 분류',
        ],
        currentWorkflow: '공고 확인 → 담당자가 요약 작성 → 게시판 등록 → 이메일 안내',
        automatedWorkflow:
          '공고문 입력 → 핵심 항목 자동 추출 → 담당자 검수 → 게시판 등록 → 이메일 안내',
        inputData: '연구과제 공고문(PDF 또는 텍스트), 공고 원문 링크',
        outputData: '핵심 조건 요약표, 분야 분류 결과',
        expectedUsers: '연구지원과 담당자, 교내 연구자',
        monthlyExpectedUsage: 60,
        automationLevel: 'HUMAN_IN_THE_LOOP',
        integrations: [
          {
            integrationSystemId: DEMO_INTEGRATION_IDS.researchSystem,
            note: '요약 결과를 공고 게시판에 등록',
          },
          {
            integrationSystemId: DEMO_INTEGRATION_IDS.externalApi,
            note: '공고문 요약을 위한 외부 LLM API 호출',
          },
        ],
        otherIntegrationNote: '',
        security: {
          classifications: classifications({
            PUBLIC: '공개된 연구과제 공고문',
            RESEARCH: '교내 연구 분야 분류 정보',
          }),
          sendsDataExternally: true,
          externalTransferTargets: '외부 LLM API (공개 공고문 요약 목적)',
          dataStorageLocation: '교내 서버',
          dataRetentionPeriod: '미설정 — 검토 단계에서 확정 예정',
          hasExecutionLog: false,
          requiresHumanApproval: true,
        },
        cost: {
          initialDevelopmentCost: 1_500_000,
          monthlyOperationCost: 25_000,
          monthlyLlmCost: 60_000,
          externalServiceCost: 0,
          costPerUser: 3_000,
          costBasis: '월 60건 요약 기준 예상치입니다.',
        },
        performance: {
          currentProcessingMinutes: 30,
          automatedProcessingMinutes: 8,
          monthlySavedHours: 22,
          errorReductionNote: '마감일 누락을 줄일 것으로 기대합니다.',
          expectedBenefit: '연구자가 공고 조건을 빠르게 파악할 수 있습니다.',
          measurementMethod: '요약 작성 시간 기록, 게시 후 조회수 집계',
        },
        repositoryUrl: 'https://example.test/demo/grant-summary',
        serviceUrl: '',
      },
    },
    {
      id: DEMO_TOOL_IDS.regulationChatbot,
      versionId: DEMO_VERSION_IDS.regulationChatbot,
      name: `${DEMO_PREFIX} 학사 규정 검색 챗봇`,
      summary: '학사 규정과 지침을 질문으로 찾아보고 근거 조항을 함께 확인합니다.',
      categoryId: DEMO_CATEGORY_IDS.informationSearch,
      departmentId: DEMO_DEPARTMENT_IDS.academicAffairs,
      ownerUserId: DEMO_USER_IDS.developer2,
      developerUserIds: [DEMO_USER_IDS.developer2],
      status: 'SUBMITTED',
      tags: ['규정', '검색', '챗봇'],
      createdDaysAgo: 8,
      version: {
        versionLabel: 'v0.3',
        changeNote: '등록 신청용 초기 버전',
        description:
          '학칙과 학사 관련 지침을 대상으로 질문에 답합니다. 답변에는 반드시 근거 조항과 원문 링크를 붙이고, 확실하지 않으면 담당 부서 문의를 안내합니다.',
        problemStatement:
          '규정 문의 전화가 반복되고, 담당자마다 안내 내용이 조금씩 달라 재확인이 필요한 경우가 있었습니다.',
        keyFeatures: ['자연어 질문 검색', '근거 조항 인용', '원문 링크 제공', '불확실 시 문의 안내'],
        currentWorkflow: '전화 또는 방문 문의 → 담당자가 규정집 확인 → 구두 안내',
        automatedWorkflow: '챗봇에 질문 → 근거 조항과 함께 답변 확인 → 필요 시 담당자 문의',
        inputData: '학칙·지침 원문, 사용자 질문',
        outputData: '답변 문장, 근거 조항, 원문 링크',
        expectedUsers: '교직원, 학생',
        monthlyExpectedUsage: 800,
        automationLevel: 'AI_ASSISTED',
        integrations: [
          {
            integrationSystemId: DEMO_INTEGRATION_IDS.academicSystem,
            note: '규정 원문 동기화 (읽기 전용)',
          },
          {
            integrationSystemId: DEMO_INTEGRATION_IDS.externalApi,
            note: '답변 생성을 위한 외부 LLM API 호출',
          },
        ],
        otherIntegrationNote: '',
        security: {
          classifications: classifications({
            PUBLIC: '공개된 학칙과 지침',
            INTERNAL: '내부 업무 지침',
          }),
          sendsDataExternally: true,
          externalTransferTargets: '외부 LLM API (질문과 규정 발췌문 전송)',
          dataStorageLocation: '교내 서버',
          dataRetentionPeriod: '질문 로그 6개월',
          hasExecutionLog: true,
          requiresHumanApproval: false,
        },
        cost: {
          initialDevelopmentCost: 4_000_000,
          monthlyOperationCost: 60_000,
          monthlyLlmCost: 250_000,
          externalServiceCost: 0,
          costPerUser: 500,
          costBasis: '월 800건 질의 기준 예상치입니다.',
        },
        performance: {
          currentProcessingMinutes: 10,
          automatedProcessingMinutes: 2,
          monthlySavedHours: 106,
          errorReductionNote: '근거 조항을 함께 제시해 안내 오류를 줄일 것으로 기대합니다.',
          expectedBenefit: '반복 문의를 줄이고 일관된 안내를 제공합니다.',
          measurementMethod: '질의 건수, 담당자 문의 전환율',
        },
        repositoryUrl: 'https://example.test/demo/regulation-chatbot',
        serviceUrl: '',
      },
    },
    {
      id: DEMO_TOOL_IDS.inquiryClassifier,
      versionId: DEMO_VERSION_IDS.inquiryClassifier,
      name: `${DEMO_PREFIX} 학생 문의 분류 도구`,
      summary: '학생 문의를 유형별로 분류해 담당 부서를 제안합니다.',
      categoryId: DEMO_CATEGORY_IDS.classificationRouting,
      departmentId: DEMO_DEPARTMENT_IDS.studentCounseling,
      ownerUserId: DEMO_USER_IDS.developer,
      developerUserIds: [DEMO_USER_IDS.developer],
      status: 'DRAFT',
      tags: ['문의', '분류', '라우팅'],
      createdDaysAgo: 3,
      version: {
        versionLabel: 'v0.1',
        changeNote: '작성 중인 초안',
        description:
          '접수된 학생 문의를 유형별로 분류하고 담당 부서를 제안합니다. 최종 배정은 담당자가 확인 후 진행합니다.',
        problemStatement:
          '문의가 여러 창구로 들어와 담당 부서를 찾는 데 시간이 걸리고, 부서 간 재이관이 반복되었습니다.',
        keyFeatures: ['문의 유형 분류', '담당 부서 제안', '유사 문의 묶기'],
        currentWorkflow: '문의 접수 → 담당자가 내용 확인 → 부서 판단 → 이관',
        automatedWorkflow: '문의 접수 → 유형 자동 분류 → 담당자 확인 → 이관',
        inputData: '문의 본문',
        outputData: '문의 유형, 담당 부서 제안',
        expectedUsers: '학생상담센터, 학사관리과',
        monthlyExpectedUsage: 300,
        automationLevel: 'HUMAN_IN_THE_LOOP',
        integrations: [],
        otherIntegrationNote: '문의 접수 채널은 아직 확정되지 않았습니다.',
        security: {
          classifications: classifications({
            PERSONAL: '문의자 이름과 학번',
            COUNSELING: '상담 관련 문의 내용',
          }),
          sendsDataExternally: false,
          externalTransferTargets: '',
          dataStorageLocation: '미정 — 작성 중',
          dataRetentionPeriod: '미설정',
          hasExecutionLog: false,
          requiresHumanApproval: true,
        },
        cost: {
          initialDevelopmentCost: null,
          monthlyOperationCost: null,
          monthlyLlmCost: null,
          externalServiceCost: null,
          costPerUser: null,
          costBasis: '아직 산출하지 않았습니다.',
        },
        performance: {
          currentProcessingMinutes: 8,
          automatedProcessingMinutes: null,
          monthlySavedHours: null,
          errorReductionNote: '',
          expectedBenefit: '부서 간 재이관을 줄입니다.',
          measurementMethod: '아직 정하지 않았습니다.',
        },
        repositoryUrl: '',
        serviceUrl: '',
      },
    },
  ];
}

function buildTools(): { tools: AutomationTool[]; versions: AutomationToolVersion[] } {
  const seeds = buildToolSeeds();
  const tools: AutomationTool[] = [];
  const versions: AutomationToolVersion[] = [];

  for (const seed of seeds) {
    const createdAt = daysAgo(seed.createdDaysAgo);
    const updatedAt = daysAgo(Math.max(0, Math.floor(seed.createdDaysAgo / 3)));

    tools.push({
      id: seed.id,
      campusId: DEMO_CAMPUS_ID,
      name: seed.name,
      summary: seed.summary,
      categoryId: seed.categoryId,
      departmentId: seed.departmentId,
      ownerUserId: seed.ownerUserId,
      operationsManagerUserId: DEMO_USER_IDS.admin,
      developerUserIds: seed.developerUserIds,
      visibility: 'CAMPUS',
      status: seed.status,
      currentVersionId: seed.versionId,
      tags: seed.tags,
      createdAt,
      updatedAt,
      createdBy: seed.ownerUserId,
      deletedAt: null,
    });

    versions.push({
      ...seed.version,
      id: seed.versionId,
      toolId: seed.id,
      campusId: DEMO_CAMPUS_ID,
      createdAt,
      updatedAt,
      createdBy: seed.ownerUserId,
      deletedAt: null,
    });
  }

  return { tools, versions };
}

/** 각 도구가 현재 상태에 이르기까지의 이력을 만든다. */
function buildStatusHistory(tools: readonly AutomationTool[]): ToolStatusHistoryEntry[] {
  const pathsByStatus: Record<ToolStatus, ToolStatus[]> = {
    DRAFT: ['DRAFT'],
    SUBMITTED: ['DRAFT', 'SUBMITTED'],
    AI_REVIEW: ['DRAFT', 'SUBMITTED'],
    HUMAN_REVIEW: ['DRAFT', 'SUBMITTED', 'HUMAN_REVIEW'],
    REVISION_REQUIRED: ['DRAFT', 'SUBMITTED', 'HUMAN_REVIEW', 'REVISION_REQUIRED'],
    PILOT: ['DRAFT', 'SUBMITTED', 'HUMAN_REVIEW', 'PILOT'],
    APPROVED: ['DRAFT', 'SUBMITTED', 'HUMAN_REVIEW', 'PILOT', 'APPROVED'],
    SUSPENDED: ['DRAFT', 'SUBMITTED', 'HUMAN_REVIEW', 'PILOT', 'APPROVED', 'SUSPENDED'],
    RETIRED: ['DRAFT', 'SUBMITTED', 'HUMAN_REVIEW', 'PILOT', 'APPROVED', 'RETIRED'],
  };

  const reasons: Partial<Record<ToolStatus, string>> = {
    DRAFT: '도구 등록을 시작했습니다.',
    SUBMITTED: '필수 항목을 모두 채우고 등록을 신청했습니다.',
    HUMAN_REVIEW: '검토자가 배정되어 검토를 시작했습니다.',
    PILOT: '위험 체크리스트 검토를 마치고 제한 범위 시범운영을 승인했습니다.',
    APPROVED: '시범운영 결과가 양호하여 정식 승인했습니다.',
  };

  const actors: Partial<Record<ToolStatus, UserId>> = {
    DRAFT: DEMO_USER_IDS.developer,
    SUBMITTED: DEMO_USER_IDS.developer,
    HUMAN_REVIEW: DEMO_USER_IDS.reviewer,
    PILOT: DEMO_USER_IDS.reviewer,
    APPROVED: DEMO_USER_IDS.admin,
  };

  const entries: ToolStatusHistoryEntry[] = [];
  let counter = 1;

  for (const tool of tools) {
    const path = pathsByStatus[tool.status];
    const createdDaysAgo = Math.max(
      1,
      Math.round((NOW.getTime() - new Date(tool.createdAt).getTime()) / 86_400_000),
    );
    const step = Math.max(1, Math.floor(createdDaysAgo / Math.max(1, path.length)));

    path.forEach((status, index) => {
      entries.push({
        id: asId<StatusHistoryId>(seedId(9, counter++)),
        toolId: tool.id,
        fromStatus: index === 0 ? null : (path[index - 1] ?? null),
        toStatus: status,
        changedBy: actors[status] ?? tool.ownerUserId,
        changedAt: daysAgo(Math.max(0, createdDaysAgo - index * step)),
        reason: reasons[status] ?? '상태를 변경했습니다.',
        reviewComment:
          status === 'PILOT'
            ? '민감정보 처리 범위가 제한적이고 사람 확인 단계가 있어 시범운영이 가능하다고 판단했습니다.'
            : '',
      });
    });
  }

  return entries;
}

/* -------------------------------------------------------------------------- */
/* 검토 데이터                                                                 */
/* -------------------------------------------------------------------------- */

function buildReviewData(): {
  assignments: ReviewAssignment[];
  comments: ReviewComment[];
  checklists: RiskChecklist[];
} {
  const assignments: ReviewAssignment[] = [
    {
      id: asId<ReviewAssignmentId>(seedId(10, 1)),
      campusId: DEMO_CAMPUS_ID,
      toolId: DEMO_TOOL_IDS.grantSummary,
      toolVersionId: DEMO_VERSION_IDS.grantSummary,
      reviewerUserId: DEMO_USER_IDS.reviewer,
      status: 'IN_PROGRESS',
      assignedBy: DEMO_USER_IDS.admin,
      assignedAt: daysAgo(6),
      completedAt: null,
    },
    {
      id: asId<ReviewAssignmentId>(seedId(10, 2)),
      campusId: DEMO_CAMPUS_ID,
      toolId: DEMO_TOOL_IDS.meetingNotes,
      toolVersionId: DEMO_VERSION_IDS.meetingNotes,
      reviewerUserId: DEMO_USER_IDS.reviewer,
      status: 'COMPLETED',
      assignedBy: DEMO_USER_IDS.admin,
      assignedAt: daysAgo(160),
      completedAt: daysAgo(150),
    },
  ];

  const comments: ReviewComment[] = [
    {
      id: asId<ReviewCommentId>(seedId(11, 1)),
      toolId: DEMO_TOOL_IDS.grantSummary,
      toolVersionId: DEMO_VERSION_IDS.grantSummary,
      authorUserId: DEMO_USER_IDS.reviewer,
      kind: 'GENERAL',
      body:
        '공고문이 공개 자료라 외부 API 전송 자체는 큰 문제가 없어 보입니다. 다만 데이터 보관기간이 "미설정"으로 되어 있어 이 부분을 확정한 뒤 시범운영으로 넘기는 것이 좋겠습니다. 실행 로그도 함께 준비해 주세요.',
      createdAt: daysAgo(4),
    },
    {
      id: asId<ReviewCommentId>(seedId(11, 2)),
      toolId: DEMO_TOOL_IDS.meetingNotes,
      toolVersionId: DEMO_VERSION_IDS.meetingNotes,
      authorUserId: DEMO_USER_IDS.reviewer,
      kind: 'APPROVAL_OPINION',
      body:
        '참석자 이름 외에는 개인정보를 다루지 않고, 결과를 사람이 확인한 뒤 배포하는 구조라 위험이 낮다고 판단했습니다. 보관기간 90일도 적절합니다.',
      createdAt: daysAgo(151),
    },
  ];

  const checklists: RiskChecklist[] = [
    {
      id: asId<RiskChecklistId>(seedId(12, 1)),
      toolVersionId: DEMO_VERSION_IDS.meetingNotes,
      items: emptyChecklistItems().map((item) =>
        item.code === 'USES_PERSONAL_DATA'
          ? {
              ...item,
              applies: true,
              note: '참석자 이름과 소속만 처리하며 연락처는 다루지 않습니다.',
            }
          : item,
      ),
      riskLevel: 'LOW',
      rationale:
        '처리하는 개인정보의 범위가 이름·소속으로 한정되고, 결과를 사람이 확인한 뒤 배포하며, 교내 저장소에만 보관합니다.',
      reviewedBy: DEMO_USER_IDS.reviewer,
      reviewedAt: daysAgo(151),
      createdAt: daysAgo(151),
      updatedAt: daysAgo(151),
    },
    {
      id: asId<RiskChecklistId>(seedId(12, 2)),
      toolVersionId: DEMO_VERSION_IDS.repetitiveEmail,
      items: emptyChecklistItems().map((item) => {
        if (item.code === 'SENDS_TO_EXTERNAL_LLM') {
          return {
            ...item,
            applies: true,
            note: '개인정보를 제외한 안내 문구 조건만 전송하고, 학습 미사용 조건을 확인했습니다.',
          };
        }
        return item;
      }),
      riskLevel: 'MEDIUM',
      rationale:
        '외부 LLM API를 사용하지만 전송 항목에 개인정보가 없고, 발송은 담당자가 직접 수행합니다.',
      reviewedBy: DEMO_USER_IDS.reviewer,
      reviewedAt: daysAgo(50),
      createdAt: daysAgo(50),
      updatedAt: daysAgo(50),
    },
  ];

  return { assignments, comments, checklists };
}

/* -------------------------------------------------------------------------- */
/* 수요                                                                        */
/* -------------------------------------------------------------------------- */

function buildDemands(): {
  demands: AutomationDemand[];
  matches: DemandMatch[];
  participants: DemandParticipant[];
} {
  const demands: AutomationDemand[] = [
    {
      id: DEMO_DEMAND_IDS.meetingTasks,
      campusId: DEMO_CAMPUS_ID,
      title: `${DEMO_PREFIX} 회의 후 담당자별 과업 정리`,
      departmentId: DEMO_DEPARTMENT_IDS.academicAffairs,
      requesterUserId: DEMO_USER_IDS.requester,
      currentWorkDescription:
        '주간 부서 회의가 끝나면 담당자가 메모를 보고 회의록을 작성하고, 후속 과업을 다시 정리해 각 담당자에게 메신저로 전달합니다.',
      mostPainfulStep:
        '회의록에서 후속 과업만 골라내 담당자별로 다시 정리하는 단계에서 시간이 가장 많이 걸리고 누락도 생깁니다.',
      inputMaterials: '회의 메모, 참석자 명단',
      desiredOutcome: '담당자별 과업 목록과 기한이 정리된 표',
      systemsInUse: '이메일, 메신저, 워드',
      workFrequency: 'WEEKLY',
      expectedUserCount: 12,
      containsPersonalData: true,
      containsAcademicOrResearchData: false,
      requiresHumanApproval: true,
      requiredFeatures: ['담당자별 과업 추출', '기한 표시'],
      optionalFeatures: ['캘린더 등록'],
      expectedBenefit: '후속 과업 누락을 줄이고 회의록 정리 시간을 단축합니다.',
      desiredCompletionDate: daysAhead(60),
      status: 'MATCHED',
      createdAt: daysAgo(90),
      updatedAt: daysAgo(80),
      createdBy: DEMO_USER_IDS.requester,
      deletedAt: null,
    },
    {
      id: DEMO_DEMAND_IDS.departmentReports,
      campusId: DEMO_CAMPUS_ID,
      title: `${DEMO_PREFIX} 학과별 실적자료 자동 취합`,
      departmentId: DEMO_DEPARTMENT_IDS.sharedUniversity,
      requesterUserId: DEMO_USER_IDS.requester,
      currentWorkDescription:
        '학기마다 참여 학과에서 실적자료를 엑셀로 제출받아 하나의 표로 합칩니다. 학과마다 서식이 달라 열을 맞추는 데 시간이 많이 듭니다.',
      mostPainfulStep: '서식이 다른 파일들의 열을 맞추고 누락 항목을 찾아 재요청하는 단계입니다.',
      inputMaterials: '학과별 실적 엑셀 파일',
      desiredOutcome: '표준 서식으로 통합된 실적표와 누락 항목 목록',
      systemsInUse: '엑셀, 이메일, 파일 저장소',
      workFrequency: 'SEMESTERLY',
      expectedUserCount: 8,
      containsPersonalData: false,
      containsAcademicOrResearchData: true,
      requiresHumanApproval: true,
      requiredFeatures: ['서식 자동 변환', '누락 항목 검출'],
      optionalFeatures: ['재요청 메일 초안'],
      expectedBenefit: '취합 기간을 이틀에서 반나절로 줄입니다.',
      desiredCompletionDate: daysAhead(120),
      status: 'OPEN',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
      createdBy: DEMO_USER_IDS.requester,
      deletedAt: null,
    },
    {
      id: DEMO_DEMAND_IDS.grantAlerts,
      campusId: DEMO_CAMPUS_ID,
      title: `${DEMO_PREFIX} 연구과제 공고 맞춤 알림`,
      departmentId: DEMO_DEPARTMENT_IDS.researchSupport,
      requesterUserId: DEMO_USER_IDS.requester2,
      currentWorkDescription:
        '연구지원과에서 공고를 확인해 전체 메일로 안내하고 있습니다. 연구자 입장에서는 본인 분야와 무관한 공고가 많아 놓치는 경우가 있습니다.',
      mostPainfulStep: '연구자별 관심 분야에 맞는 공고만 골라내는 단계입니다.',
      inputMaterials: '기관별 공고문, 연구자 관심 분야 정보',
      desiredOutcome: '연구자별 맞춤 공고 알림',
      systemsInUse: '이메일, 연구관리시스템',
      workFrequency: 'WEEKLY',
      expectedUserCount: 150,
      containsPersonalData: true,
      containsAcademicOrResearchData: true,
      requiresHumanApproval: false,
      requiredFeatures: ['분야별 분류', '개인별 알림 발송'],
      optionalFeatures: ['마감 임박 재알림'],
      expectedBenefit: '연구자의 공고 확인 부담을 줄이고 지원 기회를 놓치지 않게 합니다.',
      desiredCompletionDate: daysAhead(90),
      status: 'IN_DEVELOPMENT',
      createdAt: daysAgo(45),
      updatedAt: daysAgo(15),
      createdBy: DEMO_USER_IDS.requester2,
      deletedAt: null,
    },
    {
      id: DEMO_DEMAND_IDS.complaintRouting,
      campusId: DEMO_CAMPUS_ID,
      title: `${DEMO_PREFIX} 반복 민원 분류 및 담당부서 전달`,
      departmentId: DEMO_DEPARTMENT_IDS.studentCounseling,
      requesterUserId: DEMO_USER_IDS.requester2,
      currentWorkDescription:
        '학생 문의가 상담센터, 학사관리과, 학과 사무실로 나뉘어 들어옵니다. 담당이 아닌 곳으로 온 문의는 다시 이관하는데 이 과정이 반복됩니다.',
      mostPainfulStep: '문의 내용을 읽고 담당 부서를 판단해 이관하는 단계입니다.',
      inputMaterials: '문의 본문, 접수 채널 정보',
      desiredOutcome: '문의 유형 분류 결과와 담당 부서 제안',
      systemsInUse: '이메일, 문의 게시판',
      workFrequency: 'DAILY',
      expectedUserCount: 20,
      containsPersonalData: true,
      containsAcademicOrResearchData: false,
      requiresHumanApproval: true,
      requiredFeatures: ['문의 유형 분류', '담당 부서 제안'],
      optionalFeatures: ['유사 문의 묶기', '자주 묻는 질문 자동 추출'],
      expectedBenefit: '부서 간 재이관을 줄이고 답변 시간을 단축합니다.',
      desiredCompletionDate: daysAhead(150),
      status: 'OPEN',
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
      createdBy: DEMO_USER_IDS.requester2,
      deletedAt: null,
    },
  ];

  const matches: DemandMatch[] = [
    {
      id: asId<DemandMatchId>(seedId(13, 1)),
      demandId: DEMO_DEMAND_IDS.meetingTasks,
      toolId: DEMO_TOOL_IDS.meetingNotes,
      matchType: 'READY_TO_USE',
      rationale:
        '이미 승인된 회의록 정리 도구가 담당자별 과업 추출 기능을 포함하고 있어 추가 개발 없이 바로 사용할 수 있습니다. 사용 부서에 계정 안내만 하면 됩니다.',
      matchedBy: DEMO_USER_IDS.reviewer,
      matchedAt: daysAgo(80),
    },
    {
      id: asId<DemandMatchId>(seedId(13, 2)),
      demandId: DEMO_DEMAND_IDS.departmentReports,
      toolId: DEMO_TOOL_IDS.excelAggregation,
      matchType: 'NEEDS_CONFIGURATION',
      rationale:
        '학과별 엑셀 취합 자동화 도구를 그대로 쓸 수 있지만, 공유대학 실적 서식에 맞춰 열 매핑 설정을 추가해야 합니다.',
      matchedBy: DEMO_USER_IDS.reviewer,
      matchedAt: daysAgo(25),
    },
    {
      id: asId<DemandMatchId>(seedId(13, 3)),
      demandId: DEMO_DEMAND_IDS.grantAlerts,
      toolId: DEMO_TOOL_IDS.grantSummary,
      matchType: 'NEEDS_IMPROVEMENT',
      rationale:
        '공고 요약 서비스가 분야 분류까지는 처리하지만 연구자별 맞춤 알림 발송 기능이 없어 확장 개발이 필요합니다.',
      matchedBy: DEMO_USER_IDS.reviewer,
      matchedAt: daysAgo(20),
    },
  ];

  const participants: DemandParticipant[] = [
    {
      id: seedId(14, 1),
      demandId: DEMO_DEMAND_IDS.grantAlerts,
      userId: DEMO_USER_IDS.developer2,
      participantRole: 'DEVELOPER',
      message:
        '기존 공고 요약 서비스를 만든 담당자입니다. 알림 발송 부분을 이어서 개발할 수 있습니다.',
      joinedAt: daysAgo(18),
    },
    {
      id: seedId(14, 2),
      demandId: DEMO_DEMAND_IDS.departmentReports,
      userId: DEMO_USER_IDS.developer,
      participantRole: 'ADVISOR',
      message: '엑셀 취합 도구의 열 매핑 설정 방법을 안내해 드릴 수 있습니다.',
      joinedAt: daysAgo(22),
    },
  ];

  return { demands, matches, participants };
}

/* -------------------------------------------------------------------------- */
/* 평가 · 개선 요청                                                            */
/* -------------------------------------------------------------------------- */

function buildEvaluations(): ToolEvaluation[] {
  const rows: {
    index: number;
    toolId: ToolEvaluation['toolId'];
    versionId: ToolVersionId;
    evaluator: UserId;
    scores: ToolEvaluation['scores'];
    comment: string;
    daysAgo: number;
  }[] = [
    {
      index: 1,
      toolId: DEMO_TOOL_IDS.meetingNotes,
      versionId: DEMO_VERSION_IDS.meetingNotes,
      evaluator: DEMO_USER_IDS.requester,
      scores: {
        problemSolving: 5,
        workEfficiency: 5,
        usability: 4,
        stability: 4,
        accuracy: 4,
        spreadPotential: 5,
        overall: 5,
      },
      comment:
        '회의록 정리 시간이 눈에 띄게 줄었습니다. 담당자별 과업이 자동으로 뽑혀 나와 누락이 사라졌습니다. 다만 발언자가 겹치는 구간에서는 담당자 인식이 가끔 틀립니다.',
      daysAgo: 40,
    },
    {
      index: 2,
      toolId: DEMO_TOOL_IDS.meetingNotes,
      versionId: DEMO_VERSION_IDS.meetingNotes,
      evaluator: DEMO_USER_IDS.requester2,
      scores: {
        problemSolving: 4,
        workEfficiency: 4,
        usability: 5,
        stability: 4,
        accuracy: 3,
        spreadPotential: 4,
        overall: 4,
      },
      comment:
        '사용법이 간단해서 바로 쓸 수 있었습니다. 전문 용어가 많은 회의에서는 요약이 다소 뭉뚱그려지는 편이라 확인이 필요합니다.',
      daysAgo: 25,
    },
    {
      index: 3,
      toolId: DEMO_TOOL_IDS.excelAggregation,
      versionId: DEMO_VERSION_IDS.excelAggregation,
      evaluator: DEMO_USER_IDS.requester,
      scores: {
        problemSolving: 5,
        workEfficiency: 5,
        usability: 3,
        stability: 5,
        accuracy: 5,
        spreadPotential: 4,
        overall: 4,
      },
      comment:
        '취합 시간이 이틀에서 반나절로 줄었습니다. 다만 처음 열 매핑을 설정하는 화면이 복잡해 안내가 필요했습니다.',
      daysAgo: 35,
    },
    {
      index: 4,
      toolId: DEMO_TOOL_IDS.repetitiveEmail,
      versionId: DEMO_VERSION_IDS.repetitiveEmail,
      evaluator: DEMO_USER_IDS.requester,
      scores: {
        problemSolving: 4,
        workEfficiency: 4,
        usability: 4,
        stability: 3,
        accuracy: 3,
        spreadPotential: 3,
        overall: 3,
      },
      comment:
        '초안이 있으니 시작이 수월합니다. 다만 마감일 표현이 어색하게 나오는 경우가 있어 매번 손봐야 합니다. 시범운영 중이라 이 정도면 괜찮다고 봅니다.',
      daysAgo: 10,
    },
  ];

  return rows.map((row) => ({
    id: asId<EvaluationId>(seedId(15, row.index)),
    campusId: DEMO_CAMPUS_ID,
    toolId: row.toolId,
    toolVersionId: row.versionId,
    evaluatorUserId: row.evaluator,
    scores: row.scores,
    comment: row.comment,
    revisionCount: 0,
    createdAt: daysAgo(row.daysAgo),
    updatedAt: daysAgo(row.daysAgo),
    deletedAt: null,
  }));
}

/**
 * 감사 로그 시드.
 *
 * 비워 두면 관리자의 감사 로그 화면이 처음부터 빈 채로 보인다. 요구사항 18번이
 * "관리자 작업도 예외 없이 기록한다"인데 그 화면이 비어 있으면 기능이 없는 것처럼 읽힌다.
 *
 * 값은 넣지 않는다. 바뀐 **필드 이름**만 남긴다.
 * (역할 변경 사유는 권한 변경의 근거라 summary 에 남긴다 — DECISIONS 참고)
 */
function buildAuditLogs(): AuditLog[] {
  const rows: readonly {
    index: number;
    action: string;
    actor: keyof typeof DEMO_USER_IDS;
    actorRole: string;
    targetType: string;
    targetId: string | null;
    outcome: 'SUCCESS' | 'FAILURE';
    summary: string;
    changedFields: string[];
    daysAgo: number;
  }[] = [
    {
      index: 1,
      action: 'tool.submit',
      actor: 'developer',
      actorRole: 'DEVELOPER',
      targetType: 'tool',
      targetId: DEMO_TOOL_IDS.regulationChatbot,
      outcome: 'SUCCESS',
      summary: '도구 등록을 신청했습니다.',
      changedFields: ['status'],
      daysAgo: 21,
    },
    {
      index: 2,
      action: 'review.assign',
      actor: 'reviewer',
      actorRole: 'REVIEWER',
      targetType: 'tool',
      targetId: DEMO_TOOL_IDS.grantSummary,
      outcome: 'SUCCESS',
      summary: '검토자를 자신에게 배정했습니다.',
      changedFields: ['reviewerUserId', 'status'],
      daysAgo: 17,
    },
    {
      index: 3,
      action: 'review.checklist',
      actor: 'reviewer',
      actorRole: 'REVIEWER',
      targetType: 'tool',
      targetId: DEMO_TOOL_IDS.grantSummary,
      outcome: 'SUCCESS',
      summary: '위험 체크리스트를 작성했습니다.',
      changedFields: ['riskLevel', 'items'],
      daysAgo: 16,
    },
    {
      index: 4,
      action: 'demand.publish',
      actor: 'requester2',
      actorRole: 'REQUESTER',
      targetType: 'demand',
      targetId: DEMO_DEMAND_IDS.complaintRouting,
      outcome: 'SUCCESS',
      summary: '수요를 공개했습니다.',
      changedFields: ['status'],
      daysAgo: 13,
    },
    {
      index: 5,
      action: 'demand.match',
      actor: 'reviewer',
      actorRole: 'REVIEWER',
      targetType: 'demand',
      targetId: DEMO_DEMAND_IDS.meetingTasks,
      outcome: 'SUCCESS',
      summary: '수요에 도구를 연결했습니다.',
      changedFields: ['matchType', 'rationale'],
      daysAgo: 11,
    },
    {
      index: 6,
      action: 'evaluation.create',
      actor: 'requester',
      actorRole: 'REQUESTER',
      targetType: 'evaluation',
      targetId: null,
      outcome: 'SUCCESS',
      summary: '도구 평가를 등록했습니다.',
      changedFields: ['scores', 'comment'],
      daysAgo: 10,
    },
    {
      index: 7,
      action: 'admin.changeUserRole',
      actor: 'admin',
      actorRole: 'ADMIN',
      targetType: 'user',
      targetId: DEMO_USER_IDS.developer2,
      outcome: 'SUCCESS',
      // 역할 변경 사유는 권한을 바꾼 근거라 예외적으로 남긴다.
      summary: '역할을 개발자로 변경했습니다. 사유: 연구지원과 도구 개발 담당으로 지정',
      changedFields: ['role'],
      daysAgo: 8,
    },
    {
      index: 8,
      action: 'improvement.create',
      actor: 'requester',
      actorRole: 'REQUESTER',
      targetType: 'improvement',
      targetId: null,
      outcome: 'SUCCESS',
      summary: '개선 요청을 등록했습니다.',
      changedFields: ['title', 'content'],
      daysAgo: 6,
    },
    {
      index: 9,
      action: 'admin.deleteDepartment',
      actor: 'admin',
      actorRole: 'ADMIN',
      targetType: 'department',
      targetId: null,
      outcome: 'FAILURE',
      // 실패한 시도도 남긴다.
      summary: '소속 인원이 있어 삭제하지 못했습니다.',
      changedFields: [],
      daysAgo: 4,
    },
    {
      index: 10,
      action: 'tool.attachment.add',
      actor: 'developer',
      actorRole: 'DEVELOPER',
      targetType: 'tool',
      targetId: DEMO_TOOL_IDS.inquiryClassifier,
      outcome: 'SUCCESS',
      summary: '첨부파일을 추가했습니다.',
      changedFields: ['attachments'],
      daysAgo: 3,
    },
  ];

  return rows.map((row) => ({
    id: asId<AuditLogId>(seedId(17, row.index)),
    campusId: DEMO_CAMPUS_ID,
    action: row.action,
    actorUserId: DEMO_USER_IDS[row.actor],
    actorRole: row.actorRole,
    targetType: row.targetType,
    targetId: row.targetId,
    outcome: row.outcome,
    summary: row.summary,
    changedFields: row.changedFields,
    ipAddress: null,
    userAgent: null,
    createdAt: daysAgo(row.daysAgo),
  }));
}

function buildImprovements(): ImprovementRequest[] {
  const rows: {
    index: number;
    toolId: ImprovementRequest['toolId'];
    title: string;
    requestType: ImprovementRequest['requestType'];
    detail: string;
    businessImpact: ImprovementRequest['businessImpact'];
    urgency: ImprovementRequest['urgency'];
    requester: UserId;
    assignee: UserId | null;
    status: ImprovementRequest['status'];
    handlingComment: string;
    targetDays: number | null;
    daysAgo: number;
  }[] = [
    {
      index: 1,
      toolId: DEMO_TOOL_IDS.meetingNotes,
      title: '발언자가 겹칠 때 담당자 인식 오류',
      requestType: 'BUG_FIX',
      detail:
        '두 사람이 이어서 말한 구간에서 후속 과업의 담당자가 잘못 지정되는 경우가 있습니다. 회의록 확인 시 매번 손으로 고치고 있습니다.',
      businessImpact: 'MEDIUM',
      urgency: 'MEDIUM',
      requester: DEMO_USER_IDS.requester,
      assignee: DEMO_USER_IDS.developer,
      status: 'IN_PROGRESS',
      handlingComment:
        '발언 구간 분리 로직을 수정 중입니다. 다음 버전(v1.3)에 반영할 예정입니다.',
      targetDays: 30,
      daysAgo: 20,
    },
    {
      index: 2,
      toolId: DEMO_TOOL_IDS.excelAggregation,
      title: '열 매핑 설정 화면 사용성 개선 요청',
      requestType: 'USABILITY',
      detail:
        '처음 사용할 때 어떤 열을 어디에 연결해야 하는지 파악하기 어렵습니다. 예시나 미리보기가 있으면 좋겠습니다.',
      businessImpact: 'MEDIUM',
      urgency: 'LOW',
      requester: DEMO_USER_IDS.requester,
      assignee: null,
      status: 'OPEN',
      handlingComment: '',
      targetDays: null,
      daysAgo: 14,
    },
    {
      index: 3,
      toolId: DEMO_TOOL_IDS.repetitiveEmail,
      title: '마감일 표현을 한국어 날짜 형식으로',
      requestType: 'USABILITY',
      detail:
        '생성된 초안에서 마감일이 "2026-08-15"처럼 나옵니다. "8월 15일(토)까지"처럼 나오면 그대로 쓸 수 있겠습니다.',
      businessImpact: 'LOW',
      urgency: 'MEDIUM',
      requester: DEMO_USER_IDS.requester,
      assignee: DEMO_USER_IDS.developer,
      status: 'ACCEPTED',
      handlingComment: '반영하기로 했습니다. 날짜 서식 처리 부분만 수정하면 됩니다.',
      targetDays: 14,
      daysAgo: 7,
    },
  ];

  return rows.map((row) => ({
    id: asId<ImprovementRequestId>(seedId(16, row.index)),
    campusId: DEMO_CAMPUS_ID,
    toolId: row.toolId,
    title: row.title,
    requestType: row.requestType,
    detail: row.detail,
    businessImpact: row.businessImpact,
    urgency: row.urgency,
    requesterUserId: row.requester,
    assignedDeveloperUserId: row.assignee,
    status: row.status,
    handlingComment: row.handlingComment,
    targetCompletionDate: row.targetDays === null ? null : daysAhead(row.targetDays),
    createdAt: daysAgo(row.daysAgo),
    updatedAt: daysAgo(Math.max(0, row.daysAgo - 3)),
    createdBy: row.requester,
    deletedAt: null,
  }));
}

/* -------------------------------------------------------------------------- */
/* 조립                                                                        */
/* -------------------------------------------------------------------------- */

export function buildDemoSeed(): DemoDatabase {
  const { tools, versions } = buildTools();
  const { assignments, comments, checklists } = buildReviewData();
  const { demands, matches, participants } = buildDemands();

  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    campuses: [buildCampus()],
    departments: buildDepartments(),
    profiles: buildProfiles(),
    categories: buildCategories(),
    integrationSystems: buildIntegrationSystems(),
    tools,
    toolVersions: versions,
    toolStatusHistory: buildStatusHistory(tools),
    toolAttachments: [],
    reviewAssignments: assignments,
    reviewComments: comments,
    riskChecklists: checklists,
    demands,
    demandMatches: matches,
    demandParticipants: participants,
    evaluations: buildEvaluations(),
    evaluationHistory: [],
    improvementRequests: buildImprovements(),
    improvementRequestHistory: [],
    auditLogs: buildAuditLogs(),
    usageEvents: [],
    notifications: [],
  };
}

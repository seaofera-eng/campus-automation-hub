import { z } from 'zod';
import { MEMBER_TYPES } from '@/domain/authz/accounts';
import { AUTOMATION_LEVELS, DATA_CLASSIFICATIONS,
  RUNTIME_KINDS,
} from '@/domain/tool/types';
import {
  optionalText,
  optionalUrl,
  requiredText,
  textList,
} from './common';

/**
 * 도구 등록 폼 검증 (요구사항 6번).
 *
 * 두 단계로 나눈다.
 *  - `toolDraftSchema`  : 임시저장. 이름만 있으면 저장된다. 나중에 이어서 쓰기 위한 것이라
 *                         내용을 강제하지 않는다.
 *  - `toolSubmitSchema` : 등록 신청. 검토자가 판단할 수 있는 최소한을 강제한다.
 *
 * 두 스키마의 **출력 타입은 같다.** 그래서 서비스 계층은 하나의 타입만 다루면 된다.
 */

const classificationEntrySchema = z.object({
  classification: z.enum(DATA_CLASSIFICATIONS),
  inUse: z.boolean().default(false),
  note: optionalText,
});

/** 임시저장 기준. 이름 외에는 전부 비워 둘 수 있다. */
export const toolDraftSchema = z.object({
  /* ------------------------------------------------------------ 1. 기본정보 */
  name: requiredText('도구 이름', 2, 120),
  summary: optionalText.pipe(z.string().max(300, '한 줄 소개는 300자까지 입력할 수 있습니다.')),
  categoryId: optionalText,
  /** 어디서 실행하는가 (리뷰 4.1절) */
  runtimeKind: z.enum(RUNTIME_KINDS).default('WEB'),
  /** 누구에게 맞는 도구인가. 비우면 "누구나". 부서 대신 쓴다. */
  recommendedFor: z.array(z.enum(MEMBER_TYPES)).default([]),
  tags: textList,
  problemStatement: optionalText,

  /* ------------------------------------------------------ 2. 기능·업무흐름 */
  keyFeatures: textList,
  currentWorkflow: optionalText,
  automatedWorkflow: optionalText,
  inputData: optionalText,
  outputData: optionalText,
  expectedUsers: optionalText,
  automationLevel: z.enum(AUTOMATION_LEVELS).default('AI_ASSISTED'),

  /* --------------------------------------------------- 3. 연동·데이터/보안 */
  classifications: z.array(classificationEntrySchema).default([]),
  sendsDataExternally: z.boolean().default(false),
  externalTransferTargets: optionalText,
  dataStorageLocation: optionalText,
  dataRetentionPeriod: optionalText,
  hasExecutionLog: z.boolean().default(false),
  requiresHumanApproval: z.boolean().default(true),

  /* ------------------------------------------------------------ 4. 비용·성과 */


  repositoryUrl: optionalUrl,
  serviceUrl: optionalUrl,

  /* ------------------------------------------------------------ 버전 메타 */
  versionLabel: optionalText,
  changeNote: optionalText,
});

export type ToolFormInput = z.output<typeof toolDraftSchema>;

/** 특정 필드가 비어 있으면 필드 오류를 붙인다. */
function requireFilled(
  context: z.RefinementCtx,
  value: string,
  path: string,
  message: string,
): void {
  if (value.trim() === '') {
    context.addIssue({ code: 'custom', path: [path], message });
  }
}

/**
 * 등록 신청 기준.
 *
 * 검토자가 위험을 판단하려면 최소한 **무슨 업무를 어떤 데이터로 어떻게 처리하는지**는
 * 있어야 한다. 그래서 이 네 가지를 강제한다: 분류·소속, 문제와 업무 흐름,
 * 다루는 데이터 분류, 사람 승인 여부.
 */
export const toolSubmitSchema = toolDraftSchema.superRefine((value, context) => {
  requireFilled(context, value.summary, 'summary', '한 줄 소개를 입력해 주세요. 목록에서 이 문장으로 도구를 구분합니다.');
  requireFilled(context, value.categoryId, 'categoryId', '카테고리를 선택해 주세요.');
  requireFilled(
    context,
    value.problemStatement,
    'problemStatement',
    '이 도구가 해결하려는 업무 문제를 입력해 주세요. 검토자가 필요성을 판단하는 근거가 됩니다.',
  );
  requireFilled(
    context,
    value.currentWorkflow,
    'currentWorkflow',
    '현재 업무를 어떻게 처리하고 있는지 입력해 주세요.',
  );
  requireFilled(
    context,
    value.automatedWorkflow,
    'automatedWorkflow',
    '이 도구를 쓰면 업무가 어떻게 바뀌는지 입력해 주세요.',
  );
  requireFilled(context, value.inputData, 'inputData', '어떤 자료를 입력받는지 적어 주세요.');
  requireFilled(context, value.outputData, 'outputData', '어떤 결과물이 나오는지 적어 주세요.');

  if (value.keyFeatures.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['keyFeatures'],
      message: '주요 기능을 한 가지 이상 입력해 주세요.',
    });
  }

  const usedClassifications = value.classifications.filter((entry) => entry.inUse);
  if (usedClassifications.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['classifications'],
      message:
        '이 도구가 다루는 데이터 종류를 한 가지 이상 선택해 주세요. 공개정보만 다룬다면 "공개정보"를 선택하면 됩니다.',
    });
  }

  // 외부로 데이터를 보낸다고 했으면 어디로 보내는지가 위험 판단의 핵심이다.
  if (value.sendsDataExternally && value.externalTransferTargets.trim() === '') {
    context.addIssue({
      code: 'custom',
      path: ['externalTransferTargets'],
      message: '데이터를 보내는 외부 서비스나 API 이름을 적어 주세요. (예: OpenAI API, 사내 메일 서버)',
    });
  }

  requireFilled(
    context,
    value.dataStorageLocation,
    'dataStorageLocation',
    '데이터를 어디에 저장하는지 적어 주세요. (예: 교내 서버, 국내 클라우드)',
  );
  requireFilled(
    context,
    value.dataRetentionPeriod,
    'dataRetentionPeriod',
    '데이터를 얼마나 보관하는지 적어 주세요. 보관기간을 정하지 않은 것 자체가 위험 요소로 평가됩니다.',
  );
});

/** 저장 시 사용하는 식별자. 신규 등록이면 toolId 가 없다. */
export const saveDraftSchema = z.object({
  toolId: z.string().optional(),
  form: toolDraftSchema,
});

export const submitToolSchema = z.object({
  toolId: z.string().min(1, '먼저 임시저장을 해 주세요.'),
  form: toolSubmitSchema,
});

/**
 * 새 폼을 열 때의 초기값.
 *
 * 스키마로 parse 하지 않고 직접 만든다. 빈 폼은 아직 검증을 통과하지 못하는 상태가
 * 정상이기 때문이다(이름이 비어 있다). 서버와 클라이언트가 같은 초기값을 쓰도록
 * 여기 한 곳에 둔다.
 */
export function emptyToolForm(): ToolFormInput {
  return {
    name: '',
    summary: '',
    categoryId: '',
    runtimeKind: 'WEB',
    recommendedFor: [],
    tags: [],
    problemStatement: '',

    keyFeatures: [],
    currentWorkflow: '',
    automatedWorkflow: '',
    inputData: '',
    outputData: '',
    expectedUsers: '',
    automationLevel: 'AI_ASSISTED',

    classifications: DATA_CLASSIFICATIONS.map((classification) => ({
      classification,
      inUse: false,
      note: '',
    })),
    sendsDataExternally: false,
    externalTransferTargets: '',
    dataStorageLocation: '',
    dataRetentionPeriod: '',
    hasExecutionLog: false,
    requiresHumanApproval: true,



    repositoryUrl: '',
    serviceUrl: '',

    versionLabel: '',
    changeNote: '',
  };
}

/** 도구 하나를 가리키기만 하는 입력 (실행 기록 등) */
export const toolIdSchema = z.object({
  toolId: z.string().min(1),
});

import { z } from 'zod';
import { DEMAND_STATUSES, MATCH_TYPES, PARTICIPANT_ROLES, WORK_FREQUENCIES } from '@/domain/demand/types';
import { nullableNumber, optionalText, requiredText, textList } from './common';

/**
 * 업무 수요 폼 검증 (요구사항 8번).
 *
 * 도구 등록과 같은 구조: 임시저장은 제목만, 공개는 판단에 필요한 항목을 강제한다.
 * 수요는 도구보다 가볍게 쓸 수 있어야 하므로 필수 항목을 최소로 잡았다.
 */

export const demandDraftSchema = z.object({
  title: requiredText('수요 제목', 2, 150),

  currentWorkDescription: optionalText,
  mostPainfulStep: optionalText,
  inputMaterials: optionalText,
  desiredOutcome: optionalText,
  systemsInUse: optionalText,
  workFrequency: z.enum(WORK_FREQUENCIES).default('MONTHLY'),
  expectedUserCount: nullableNumber,

  containsPersonalData: z.boolean().default(false),
  containsAcademicOrResearchData: z.boolean().default(false),
  requiresHumanApproval: z.boolean().default(true),

  requiredFeatures: textList,
  optionalFeatures: textList,
  expectedBenefit: optionalText,
  desiredCompletionDate: optionalText.refine(
    (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
    { message: '날짜를 YYYY-MM-DD 형식으로 입력해 주세요.' },
  ),
});

export type DemandFormInput = z.output<typeof demandDraftSchema>;

/**
 * 공개 기준.
 *
 * 개발자가 "내가 만들 수 있는 일인가"를 판단하려면 최소한 지금 어떤 업무를
 * 어떻게 하고 있고 무엇을 원하는지는 있어야 한다.
 */
export const demandPublishSchema = demandDraftSchema.superRefine((value, context) => {
  const require = (field: keyof DemandFormInput, message: string) => {
    if (String(value[field] ?? '').trim() === '') {
      context.addIssue({ code: 'custom', path: [field], message });
    }
  };

  require(
    'currentWorkDescription',
    '지금 이 업무를 어떻게 처리하고 있는지 적어 주세요. 개발자가 무엇을 만들지 판단하는 근거가 됩니다.',
  );
  require('mostPainfulStep', '어느 단계가 가장 번거로운지 적어 주세요.');
  require('desiredOutcome', '어떤 결과물을 원하는지 적어 주세요.');

  if (value.requiredFeatures.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['requiredFeatures'],
      message: '꼭 필요한 기능을 한 가지 이상 적어 주세요.',
    });
  }
});

export const saveDemandDraftSchema = z.object({
  demandId: z.string().optional(),
  form: demandDraftSchema,
});

export const publishDemandSchema = z.object({
  demandId: z.string().min(1, '먼저 임시저장을 해 주세요.'),
  form: demandPublishSchema,
});

export const demandTransitionSchema = z.object({
  demandId: z.string().min(1),
  toStatus: z.enum(DEMAND_STATUSES),
  reason: optionalText,
});

/** 수요-도구 연결 (요구사항 8번). 사람이 직접 고르고 사유를 적는다. */
export const linkToolSchema = z.object({
  demandId: z.string().min(1),
  toolId: z.string().min(1, '연결할 도구를 선택해 주세요.'),
  matchType: z.enum(MATCH_TYPES),
  rationale: requiredText('연결 사유', 10, 1000),
});

export const unlinkToolSchema = z.object({
  demandId: z.string().min(1),
  matchId: z.string().min(1),
});

export const joinDemandSchema = z.object({
  demandId: z.string().min(1),
  participantRole: z.enum(PARTICIPANT_ROLES).default('DEVELOPER'),
  message: requiredText('참여 메시지', 5, 1000),
});

/** 새 수요 폼의 초기값. */
export function emptyDemandForm(): DemandFormInput {
  return {
    title: '',
    currentWorkDescription: '',
    mostPainfulStep: '',
    inputMaterials: '',
    desiredOutcome: '',
    systemsInUse: '',
    workFrequency: 'MONTHLY',
    expectedUserCount: null,
    containsPersonalData: false,
    containsAcademicOrResearchData: false,
    requiresHumanApproval: true,
    requiredFeatures: [],
    optionalFeatures: [],
    expectedBenefit: '',
    desiredCompletionDate: '',
  };
}

/* -------------------------------------------------------------------------- */
/* 목록 검색 조건                                                              */
/* -------------------------------------------------------------------------- */

export interface DemandQueryInput {
  keyword: string;
  statuses: string[];
  onlyMine: boolean;
  page: number;
  pageSize: number;
}

export function parseDemandQuery(
  searchParams: Record<string, string | string[] | undefined>,
): DemandQueryInput {
  function list(key: string, allowed?: readonly string[]): string[] {
    const raw = searchParams[key];
    const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
    const flattened = [...new Set(values.flatMap((value) => value.split(',')).map((v) => v.trim()))]
      .filter((value) => value !== '');
    return allowed ? flattened.filter((value) => allowed.includes(value)) : flattened;
  }

  function single(key: string): string {
    const raw = searchParams[key];
    return (Array.isArray(raw) ? raw[0] : raw) ?? '';
  }

  const pageValue = Number(single('page'));

  return {
    keyword: single('q').trim().slice(0, 100),
    statuses: list('status', DEMAND_STATUSES),
    onlyMine: single('mine') === '1',
    page: Number.isFinite(pageValue) && pageValue >= 1 ? Math.floor(pageValue) : 1,
    pageSize: 12,
  };
}

export function buildDemandHref(
  query: DemandQueryInput,
  overrides: Partial<DemandQueryInput> = {},
): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (merged.keyword) params.set('q', merged.keyword);
  for (const status of merged.statuses) params.append('status', status);
  if (merged.onlyMine) params.set('mine', '1');
  if (merged.page > 1) params.set('page', String(merged.page));

  const queryString = params.toString();
  return queryString ? `/demands?${queryString}` : '/demands';
}

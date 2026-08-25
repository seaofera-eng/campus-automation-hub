import type { RiskChecklistId, ToolVersionId, UserId } from '../shared/ids';
import type { RiskLevel } from './types';

/**
 * 위험 체크리스트 (요구사항 15번).
 *
 * 1단계에서는 **사람이 직접 판단해서 체크**한다. 자동 산정하지 않는다.
 * 2단계 RiskAssessmentService가 붙으면 같은 항목 정의를 입력으로 사용해
 * 초안을 제안하고, 최종 확정은 계속 사람이 한다.
 */

export const RISK_FACTOR_CODES = [
  'USES_PERSONAL_DATA',
  'USES_SENSITIVE_RECORDS',
  'USES_RESEARCH_SECURITY_DATA',
  'SENDS_TO_EXTERNAL_LLM',
  'STORES_OVERSEAS',
  'NO_RETENTION_PERIOD',
  'NO_ACCESS_CONTROL',
  'NO_EXECUTION_LOG',
  'RUNS_WITHOUT_HUMAN_CHECK',
  'AFFECTS_STUDENT_DECISIONS',
  'AUTO_APPROVES_SPENDING',
  'SENDS_EXTERNAL_EMAIL',
  'DELETES_OR_MUTATES_FILES',
  'USES_ADMIN_PRIVILEGES',
] as const;

export type RiskFactorCode = (typeof RISK_FACTOR_CODES)[number];

export interface RiskFactorDefinition {
  code: RiskFactorCode;
  label: string;
  /** 검토자가 무엇을 확인해야 하는지 */
  question: string;
  /** 해당될 경우 권장되는 통제 방안 */
  suggestedControl: string;
  /**
   * 이 항목만으로 CRITICAL 후보가 되는가.
   * 최종 등급은 검토자가 정하되, UI에서 경고를 띄우는 근거로 쓴다.
   */
  criticalCandidate: boolean;
}

export const RISK_FACTORS: readonly RiskFactorDefinition[] = [
  {
    code: 'USES_PERSONAL_DATA',
    label: '개인정보 사용',
    question: '이름·연락처·학번 등 개인을 식별할 수 있는 정보를 처리합니까?',
    suggestedControl: '수집 항목 최소화, 처리 목적 명시, 개인정보 담당 부서 사전 검토',
    criticalCandidate: false,
  },
  {
    code: 'USES_SENSITIVE_RECORDS',
    label: '성적·상담·인사정보 사용',
    question: '성적, 상담 기록, 인사 정보처럼 민감한 기록을 다룹니까?',
    suggestedControl: '접근 권한을 담당자로 한정, 조회 이력 기록, 원본 반출 금지',
    criticalCandidate: true,
  },
  {
    code: 'USES_RESEARCH_SECURITY_DATA',
    label: '연구보안 정보 사용',
    question: '보안과제·미공개 연구자료 등 연구보안 대상 정보를 다룹니까?',
    suggestedControl: '연구보안 담당 부서 검토, 외부 전송 차단, 저장 위치 교내 한정',
    criticalCandidate: true,
  },
  {
    code: 'SENDS_TO_EXTERNAL_LLM',
    label: '외부 LLM 또는 API 전송',
    question: '처리 데이터를 외부 LLM이나 외부 API로 전송합니까?',
    suggestedControl: '전송 전 비식별 처리, 학습 미사용 계약 확인, 전송 대상·항목 문서화',
    criticalCandidate: false,
  },
  {
    code: 'STORES_OVERSEAS',
    label: '해외 서버 저장',
    question: '데이터가 국외 리전에 저장됩니까?',
    suggestedControl: '국내 리전으로 변경, 불가 시 국외 이전 동의 및 근거 확보',
    criticalCandidate: true,
  },
  {
    code: 'NO_RETENTION_PERIOD',
    label: '데이터 보관기간 미설정',
    question: '보관기간과 파기 절차가 정해져 있지 않습니까?',
    suggestedControl: '보관기간 명시, 자동 파기 배치 구성',
    criticalCandidate: false,
  },
  {
    code: 'NO_ACCESS_CONTROL',
    label: '사용자별 접근통제 부재',
    question: '누구나 동일하게 접근할 수 있고 사용자별 권한 구분이 없습니까?',
    suggestedControl: '역할 기반 접근통제 적용, 최소 권한 원칙',
    criticalCandidate: false,
  },
  {
    code: 'NO_EXECUTION_LOG',
    label: '실행 로그 부재',
    question: '누가 언제 무엇을 실행했는지 남지 않습니까?',
    suggestedControl: '실행 로그 적재, 최소 6개월 보관',
    criticalCandidate: false,
  },
  {
    code: 'RUNS_WITHOUT_HUMAN_CHECK',
    label: '사람이 확인하지 않는 자동 실행',
    question: '사람의 확인 없이 결과가 그대로 반영되거나 발송됩니까?',
    suggestedControl: '사람 승인 단계 삽입, 최소한 사후 확인 절차 마련',
    criticalCandidate: false,
  },
  {
    code: 'AFFECTS_STUDENT_DECISIONS',
    label: '학생 선발·평가·불이익 결정',
    question: '결과가 학생의 선발, 평가, 불이익 결정에 직접 영향을 줍니까?',
    suggestedControl: '사람의 최종 판단 필수화, 이의제기 절차 마련, 판단 근거 기록',
    criticalCandidate: true,
  },
  {
    code: 'AUTO_APPROVES_SPENDING',
    label: '비용 지출 자동 승인',
    question: '사람 확인 없이 비용이 지출되거나 결재가 승인됩니까?',
    suggestedControl: '지출 한도 설정, 사람 승인 단계 필수화',
    criticalCandidate: true,
  },
  {
    code: 'SENDS_EXTERNAL_EMAIL',
    label: '외부 이메일 자동 발송',
    question: '교외 수신자에게 이메일이 자동으로 발송됩니까?',
    suggestedControl: '발송 전 미리보기·승인, 발송 이력 보관, 수신자 범위 제한',
    criticalCandidate: false,
  },
  {
    code: 'DELETES_OR_MUTATES_FILES',
    label: '파일 삭제 또는 원본 변경',
    question: '원본 파일을 삭제하거나 덮어쓸 수 있습니까?',
    suggestedControl: '원본 보존 후 사본 처리, 되돌리기 가능한 설계, 백업 확인',
    criticalCandidate: true,
  },
  {
    code: 'USES_ADMIN_PRIVILEGES',
    label: '관리자 권한 사용',
    question: '시스템 관리자 계정이나 광범위한 권한으로 동작합니까?',
    suggestedControl: '전용 서비스 계정 발급, 권한 범위 최소화, 주기적 권한 검토',
    criticalCandidate: true,
  },
];

export function getRiskFactor(code: RiskFactorCode): RiskFactorDefinition {
  const found = RISK_FACTORS.find((factor) => factor.code === code);
  if (!found) throw new Error(`알 수 없는 위험 요소 코드: ${code}`);
  return found;
}

export interface RiskChecklistItem {
  code: RiskFactorCode;
  /** 검토자가 "해당됨"으로 표시했는가 */
  applies: boolean;
  /** 적용한 통제 방안 또는 판단 근거 */
  note: string;
}

export interface RiskChecklist {
  id: RiskChecklistId;
  toolVersionId: ToolVersionId;
  items: RiskChecklistItem[];
  /** 검토자가 최종 확정한 등급. 자동 산정값이 아니다. */
  riskLevel: RiskLevel;
  /** 등급을 그렇게 정한 이유 */
  rationale: string;
  reviewedBy: UserId;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 검토자가 등급을 고를 때 참고할 **제안값**을 계산한다.
 *
 * 주의: 이것은 AI 평가가 아니라 체크된 항목 수를 세는 단순 규칙이다.
 * 화면에서도 "참고용 제안"이라고 명시하고, 저장되는 값은 검토자가 고른 등급이다.
 */
export function suggestRiskLevel(items: readonly RiskChecklistItem[]): RiskLevel {
  const applied = items.filter((item) => item.applies);
  if (applied.length === 0) return 'LOW';

  const criticalCount = applied.filter((item) => getRiskFactor(item.code).criticalCandidate).length;

  if (criticalCount >= 2) return 'CRITICAL';
  if (criticalCount === 1) return 'HIGH';
  if (applied.length >= 4) return 'HIGH';
  if (applied.length >= 2) return 'MEDIUM';
  return 'MEDIUM';
}

/** 아직 체크리스트가 없을 때 쓰는 빈 항목 목록 */
export function emptyChecklistItems(): RiskChecklistItem[] {
  return RISK_FACTORS.map((factor) => ({ code: factor.code, applies: false, note: '' }));
}

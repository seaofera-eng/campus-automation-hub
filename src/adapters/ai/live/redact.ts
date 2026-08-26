import type { AutomationDemand } from '@/domain/demand/types';
import type { AutomationTool, AutomationToolVersion } from '@/domain/tool/types';

/**
 * 모델에 보낼 내용을 만드는 **유일한 통로**.
 *
 * 학내 플랫폼이라 "개인정보가 외부 모델로 가지 않느냐"는 질문을 반드시 받는다.
 * "안 보냅니다"를 말이 아니라 코드로 보여줄 수 있어야 한다.
 *
 * 그래서 **허용 목록 방식**이다. 여기 적힌 필드만 나간다.
 * 도메인 타입에 새 필드가 생겨도 여기에 적지 않으면 자동으로 새어 나가지 않는다.
 *
 * ## 보내는 것 — 도구·수요를 설명하는 메타데이터
 *
 * 이름, 소개, 해결하려는 문제, 기능 목록, 업무 흐름 설명, 데이터 분류의 **이름**,
 * 자동화 수준, 실행 방식. 전부 등록자가 "이런 도구입니다"라고 공개하려고 쓴 글이다.
 *
 * ## 보내지 않는 것
 *
 * - 도구가 **실제로 처리한 데이터** — 애초에 이 플랫폼이 갖고 있지도 않다
 * - 첨부파일 내용
 * - 평가 원문 (익명이라도 사람에 대한 판단이 섞인 글이다)
 * - 수요 문의 원문
 * - 사람 이름·이메일·학번·사번 등 식별 정보
 * - 감사 로그
 *
 * ## 이름을 넣지 않는 이유
 *
 * "김개발이 만든 도구"라고 보내면 모델 판단에 사람이 끼어든다. 도구를 도구로만
 * 비교하려면 만든 사람이 누구인지 몰라야 한다. 화면에서 근거를 읽는 검토자도
 * 같은 이유로 이름 없는 판단을 받는 편이 낫다.
 */

/** 모델이 보는 도구 한 건. 이 모양 밖의 것은 나가지 않는다. */
export interface ToolDigest {
  /** 도구를 가리키는 식별자. 이름이 아니라 ID 라 개인정보가 아니다. */
  id: string;
  name: string;
  summary: string;
  problemStatement: string;
  keyFeatures: string[];
  currentWorkflow: string;
  automatedWorkflow: string;
  inputData: string;
  outputData: string;
  automationLevel: string;
  runtimeKind: string;
  categoryName: string;
  tags: string[];
  /** 분류 **이름**만. 실제 데이터는 없다. */
  dataClassifications: string[];
  sendsDataExternally: boolean;
}

export function toToolDigest(
  tool: AutomationTool,
  version: AutomationToolVersion,
  categoryName: string,
): ToolDigest {
  return {
    id: tool.id,
    name: tool.name,
    summary: tool.summary,
    problemStatement: version.problemStatement,
    keyFeatures: [...version.keyFeatures],
    currentWorkflow: version.currentWorkflow,
    automatedWorkflow: version.automatedWorkflow,
    inputData: version.inputData,
    outputData: version.outputData,
    automationLevel: version.automationLevel,
    runtimeKind: tool.runtimeKind,
    categoryName,
    tags: [...tool.tags],
    dataClassifications: version.security.classifications
      .filter((entry) => entry.inUse)
      .map((entry) => entry.classification),
    sendsDataExternally: version.security.sendsDataExternally,
  };
}

/** 모델이 보는 수요 한 건. */
export interface DemandDigest {
  id: string;
  title: string;
  currentWorkDescription: string;
  mostPainfulStep: string;
  inputMaterials: string;
  desiredOutcome: string;
  requiredFeatures: string[];
  optionalFeatures: string[];
  workFrequency: string;
  containsIdentifiablePersonalData: boolean;
}

export function toDemandDigest(demand: AutomationDemand): DemandDigest {
  return {
    id: demand.id,
    title: demand.title,
    currentWorkDescription: demand.currentWorkDescription,
    mostPainfulStep: demand.mostPainfulStep,
    inputMaterials: demand.inputMaterials,
    desiredOutcome: demand.desiredOutcome,
    requiredFeatures: [...demand.requiredFeatures],
    optionalFeatures: [...demand.optionalFeatures],
    workFrequency: demand.workFrequency,
    containsIdentifiablePersonalData: demand.containsIdentifiablePersonalData,
  };
}

/**
 * 보내면 안 되는 낱말이 payload 에 섞였는지 마지막으로 확인한다.
 *
 * 허용 목록을 이미 통과한 뒤의 **이중 잠금**이다. 등록자가 도구 설명에
 * 실수로 "담당자 연락처 010-1234-5678" 같은 것을 적어 넣었을 수 있다.
 *
 * 막지 않고 **가린다.** 여기서 예외를 던지면 도구 하나 때문에 분석 전체가
 * 멈춘다. 가린 자리는 남겨서 나중에 세어 볼 수 있게 한다.
 */
const SENSITIVE_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\b01[016-9][-\s]?\d{3,4}[-\s]?\d{4}\b/g, label: '[연락처]' },
  { pattern: /\b\d{6}[-\s]?[1-4]\d{6}\b/g, label: '[주민등록번호]' },
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, label: '[이메일]' },
  // 학번·사번으로 보이는 7~10자리 숫자 뭉치
  { pattern: /\b\d{7,10}\b/g, label: '[번호]' },
];

export function scrub(value: string): string {
  return SENSITIVE_PATTERNS.reduce(
    (text, { pattern, label }) => text.replace(pattern, label),
    value,
  );
}

/**
 * 가리지 않고 그대로 두는 키.
 *
 * `id` 는 우리가 만든 UUID 다. 사람이 쓴 글이 아니라 기계가 붙인 이름표라
 * 가릴 개인정보가 없다.
 *
 * 그리고 **가리면 안 된다.** UUID 의 `00000006-...` 같은 마디가 학번 패턴
 * (7~10자리 숫자)에 걸려 `[번호]-...` 로 뭉개지면, 모델은 뭉개진 id 를 돌려주고
 * 우리는 그걸 "보낸 적 없는 도구"로 보고 버린다. 판단이 통째로 사라진다.
 * 실제로 그랬다 — 중복 탐지와 수요 매칭이 조용히 빈 결과를 냈다.
 */
const UNSCRUBBED_KEYS: ReadonlySet<string> = new Set(['id']);

/** digest 안의 모든 문자열에 scrub 를 적용한다. */
export function scrubDigest<T>(digest: T): T {
  if (typeof digest === 'string') return scrub(digest) as T;
  if (Array.isArray(digest)) return digest.map((item) => scrubDigest(item)) as T;
  if (digest !== null && typeof digest === 'object') {
    return Object.fromEntries(
      Object.entries(digest).map(([key, value]) =>
        UNSCRUBBED_KEYS.has(key) ? [key, value] : [key, scrubDigest(value)],
      ),
    ) as T;
  }
  return digest;
}

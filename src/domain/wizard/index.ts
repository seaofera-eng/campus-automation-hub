import type { WorkFrequency } from '../demand/types';
import { withJosa } from '../shared/josa';
import type { SimilarityInput } from '../similarity';

/**
 * 맞춤 AI 찾기 마법사 (리뷰 2026-08-26 2절).
 *
 * ## 왜 서술형을 걷어냈나
 *
 * 기존 수요 등록은 빈 칸 다섯 개를 놓고 "지금 어떻게 하고 계신가요"를 물었다.
 * 리뷰에서 나온 지적은 두 가지였다 — **여러 번 물어본다**, 그리고 **예시가
 * 도움이 안 된다**. 둘 다 같은 원인이다. 쓰는 사람은 자기 업무를 남에게
 * 설명해 본 적이 없는데, 빈 칸은 설명을 요구한다.
 *
 * 그래서 다섯 단계 모두 **고르는 것**으로 바꿨다. 고르면 문장은 우리가 만든다.
 * 서술형은 마지막 단계에 한 칸만, 그것도 선택으로 남긴다.
 *
 * ## 이 파일이 하는 일
 *
 * 선택지 정의와 **고른 것을 문장으로 바꾸는 계산**이다. 순수 함수만 둔다.
 * 모델 호출은 여기 없다 — 모델이 없거나 실패해도 이 계산만으로 수요 한 건이
 * 완성되어야 하기 때문이다. 모델은 이 결과를 **다듬는** 역할이고, 없으면
 * 없는 대로 등록할 수 있다.
 *
 * ## 여기서 만든 문장은 AI 가 쓴 것이 아니다
 *
 * 화면에서 둘을 섞어 보여주면 안 된다. 모델이 다듬은 것과 규칙으로 조립한
 * 것은 출처가 다르고, 검토자가 "이건 누가 쓴 문장이냐"를 물을 수 있어야 한다.
 * `DemandDraft.source` 가 그 구분이다.
 */

/* -------------------------------------------------------------------------- */
/* 선택지                                                                      */
/* -------------------------------------------------------------------------- */

export interface WizardOption {
  /** 저장·비교에 쓰는 값. 화면 문구를 바꿔도 이 값은 그대로 둔다. */
  value: string;
  /** 버튼에 쓰는 짧은 말 */
  label: string;
  /** 버튼 아래 한 줄. 고르는 사람이 헷갈리지 않게 예를 든다. */
  hint: string;
  /**
   * 문장을 만들 때 쓰는 말.
   * 라벨을 그대로 쓰면 "문서를 정리·요약하기 업무를 하고 있습니다" 처럼 어색해진다.
   */
  phrase: string;
  /**
   * 도구를 찾을 때 쓰는 낱말들.
   *
   * ## 왜 따로 두는가
   *
   * 라벨은 **고르기 쉽게** 지은 말이고, 도구 설명은 만든 사람이 **자기 말로**
   * 쓴 문장이다. 둘은 같은 것을 가리켜도 글자가 안 겹친다. "녹음·영상"으로
   * 도구를 찾으면 "회의 녹취록 텍스트"를 못 만난다.
   *
   * 실제로 이 때문에 마법사 추천이 0건이었다. 사람이 고른 답이 정확했는데도
   * 화면에는 "맞는 도구를 찾지 못했습니다"가 나왔다.
   *
   * 그래서 같은 것을 부르는 다른 말을 여기 적어 둔다. 화면에는 안 나오고
   * 검색에만 쓴다.
   */
  keywords: readonly string[];
}

/** STEP 1 — 무슨 일을 하고 싶나요? */
export const TASK_KINDS: readonly WizardOption[] = [
  {
    value: 'SUMMARIZE',
    label: '문서 정리·요약',
    hint: '회의록, 보고서, 긴 문서를 간추립니다',
    phrase: '긴 문서나 회의 내용을 읽고 요약해서 정리하는 일',
    keywords: ['요약','정리','회의록','녹취','회의','간추리','핵심','정리본','회의 내용'],
  },
  {
    value: 'COLLECT',
    label: '자료 취합',
    hint: '여러 곳에서 온 파일을 하나로 모읍니다',
    phrase: '여러 부서나 여러 파일에 흩어진 자료를 하나로 모으는 일',
    keywords: ['취합','모으','수집','통합','합치','집계','제출','파일 모음','병합'],
  },
  {
    value: 'CONVERT',
    label: '변환·서식 맞추기',
    hint: '파일 형식을 바꾸거나 양식을 통일합니다',
    phrase: '파일 형식을 바꾸거나 서로 다른 서식을 하나로 맞추는 일',
    keywords: ['변환','서식','양식','형식','포맷','일괄','바꾸','통일','파일 변환'],
  },
  {
    value: 'NOTIFY',
    label: '알림·모니터링',
    hint: '새 공고나 변경 사항을 놓치지 않게 알려 줍니다',
    phrase: '새로 올라온 내용이나 바뀐 내용을 확인해서 알려 주는 일',
    keywords: ['알림','공고','모니터링','확인','새 글','변경','메일 발송','안내','통보'],
  },
  {
    value: 'CLASSIFY',
    label: '분류·배분',
    hint: '들어온 것을 종류별로 나눠 담당자에게 넘깁니다',
    phrase: '들어온 건을 종류별로 나누고 맡을 사람에게 넘기는 일',
    keywords: ['분류','배분','담당자','민원','접수','나누','라벨','배정','전달'],
  },
  {
    value: 'ANSWER',
    label: '문의 응대',
    hint: '반복되는 질문에 답할 초안을 만듭니다',
    phrase: '반복해서 들어오는 질문에 답할 내용을 준비하는 일',
    keywords: ['문의','응대','질문','답변','챗봇','상담','규정','안내','자주 묻는'],
  },
  {
    value: 'ANALYZE',
    label: '집계·분석',
    hint: '숫자를 모아 표나 그래프로 만듭니다',
    phrase: '흩어진 숫자를 모아 집계하고 표나 그래프로 만드는 일',
    keywords: ['집계','분석','통계','실적','현황','그래프','차트','합계','수치'],
  },
  {
    value: 'DRAFT',
    label: '문서 초안 작성',
    hint: '공문, 안내문, 보고서 초안을 씁니다',
    phrase: '공문이나 안내문 같은 문서의 초안을 쓰는 일',
    keywords: ['초안','작성','공문','안내문','보고서','문서 작성','기안','메일 작성'],
  },
];

/** STEP 2 — 어떤 자료를 사용하나요? (여러 개) */
export const INPUT_KINDS: readonly WizardOption[] = [
  {
    value: 'HWP_DOC',
    label: '한글·워드 문서',
    hint: '.hwp, .docx',
    phrase: '한글이나 워드 문서',
    keywords: ['한글','워드','hwp','docx','문서','보고서','공문','문서 파일'],
  },
  { value: 'EXCEL', label: '엑셀·CSV', hint: '.xlsx, .csv', phrase: '엑셀이나 CSV 표', keywords: ['엑셀','xlsx','csv','스프레드시트','표','시트','자료표'] },
  { value: 'PDF', label: 'PDF', hint: '스캔본 포함', phrase: 'PDF 파일', keywords: ['pdf','스캔','문서','출력물'] },
  { value: 'EMAIL', label: '이메일', hint: '받은 메일, 첨부파일', phrase: '이메일과 첨부파일', keywords: ['메일','이메일','메일함','첨부','수신','발신'] },
  {
    value: 'WEB',
    label: '웹페이지·게시판',
    hint: '학내 공지, 외부 공고 사이트',
    phrase: '웹페이지나 게시판에 올라온 글',
    keywords: ['웹','홈페이지','게시판','공지','사이트','포털','게시물'],
  },
  {
    value: 'IMAGE',
    label: '이미지·스캔본',
    hint: '사진 찍은 서류, 스캔한 종이',
    phrase: '사진이나 스캔한 서류',
    keywords: ['이미지','사진','스캔','서류','캡처','그림'],
  },
  {
    value: 'AUDIO',
    label: '녹음·영상',
    hint: '회의 녹음, 강의 영상',
    phrase: '회의 녹음이나 영상',
    keywords: ['녹음','음성','영상','녹취','회의','강의','동영상','음원','회의 녹취록'],
  },
  {
    value: 'SYSTEM',
    label: '학내 시스템 자료',
    hint: '학사·행정 시스템에서 내려받은 것',
    phrase: '학내 시스템에서 내려받은 자료',
    keywords: ['학사','행정','시스템','내려받','포털','데이터','원장'],
  },
];

/** STEP 3 — 어떤 결과가 필요하나요? (여러 개) */
export const OUTPUT_KINDS: readonly WizardOption[] = [
  { value: 'SUMMARY', label: '요약문', hint: '핵심만 간추린 글', phrase: '요약된 글', keywords: ['요약','요약문','핵심','정리','간추린','요약 회의록','회의록'] },
  { value: 'TABLE', label: '표·스프레드시트', hint: '정리된 엑셀 표', phrase: '정리된 표', keywords: ['표','엑셀','스프레드시트','정리표','통합','시트','목록'] },
  { value: 'FILE', label: '변환된 파일', hint: 'PDF 등 원하는 형식', phrase: '원하는 형식으로 바뀐 파일', keywords: ['파일','변환','pdf','문서 파일','출력','산출물'] },
  { value: 'MESSAGE', label: '알림 메시지', hint: '메일, 메신저로 받기', phrase: '메일이나 메신저 알림', keywords: ['알림','메일','메신저','발송','안내','통보','메시지'] },
  { value: 'DOCUMENT', label: '문서 초안', hint: '바로 손볼 수 있는 원고', phrase: '손볼 수 있는 문서 초안', keywords: ['문서','초안','원고','공문','보고서','작성','회의록'] },
  { value: 'LABEL', label: '분류 결과', hint: '종류·담당자가 붙은 목록', phrase: '분류가 끝난 목록', keywords: ['분류','목록','담당자','배정','태그','구분'] },
  { value: 'CHART', label: '집계·그래프', hint: '합계, 추이 그래프', phrase: '집계 결과와 그래프', keywords: ['집계','그래프','차트','통계','합계','추이','현황'] },
];

/** STEP 4 — 얼마나 자주 하나요? */
export interface FrequencyOption extends WizardOption {
  value: WorkFrequency;
}

export const FREQUENCY_OPTIONS: readonly FrequencyOption[] = [
  { value: 'DAILY', label: '매일', hint: '하루에 한 번 이상', phrase: '매일', keywords: ['매일','일간','하루'] },
  { value: 'WEEKLY', label: '매주', hint: '주 단위로 반복', phrase: '매주', keywords: ['매주','주간','주 단위'] },
  { value: 'MONTHLY', label: '매월', hint: '월 단위로 반복', phrase: '매월', keywords: ['매월','월간','월 단위'] },
  { value: 'SEMESTERLY', label: '학기마다', hint: '학기 초·말에 몰림', phrase: '학기마다', keywords: ['학기','학기말','학기초'] },
  { value: 'IRREGULAR', label: '비정기', hint: '필요할 때만', phrase: '필요할 때마다', keywords: ['비정기','수시','필요할 때'] },
];

/**
 * STEP 5 — 중요한 조건이 있나요? (여러 개, 없어도 됨)
 *
 * 개인정보·학사정보 항목은 **수요의 보안 표시로 그대로 넘어간다.** 나중에
 * 검토자가 위험도를 정할 때 첫 근거가 되므로, 고르기 쉬운 말로 적되 뜻은
 * 흐리지 않는다.
 */
export interface ConstraintOption extends WizardOption {
  /** 이 조건이 수요의 어떤 표시로 이어지는가 */
  maps?: 'personal' | 'academic' | 'humanApproval';
}

export const CONSTRAINT_OPTIONS: readonly ConstraintOption[] = [
  {
    value: 'PERSONAL_DATA',
    label: '개인정보가 들어 있음',
    hint: '이름, 학번, 연락처, 주민등록번호 등',
    phrase: '개인을 알아볼 수 있는 정보가 들어 있습니다',
    keywords: ['개인정보','이름','학번','연락처','주민등록번호'],
    maps: 'personal',
  },
  {
    value: 'ACADEMIC_DATA',
    label: '학사·연구 정보가 들어 있음',
    hint: '성적, 연구과제, 심사 자료 등',
    phrase: '학사나 연구 관련 정보가 들어 있습니다',
    keywords: ['학사','성적','연구','과제','심사'],
    maps: 'academic',
  },
  {
    value: 'HUMAN_CHECK',
    label: '사람이 최종 확인해야 함',
    hint: '결과를 그대로 내보내면 안 되는 일',
    phrase: '결과를 내보내기 전에 사람이 반드시 확인해야 합니다',
    keywords: ['검토','확인','승인','사람'],
    maps: 'humanApproval',
  },
  {
    value: 'HIGH_VOLUME',
    label: '한 번에 처리할 양이 많음',
    hint: '수십~수백 건을 한꺼번에',
    phrase: '한 번에 많은 양을 처리해야 합니다',
    keywords: ['대량','일괄','다건','한꺼번에'],
  },
  {
    value: 'DEADLINE',
    label: '마감이 정해져 있음',
    hint: '특정 시기에 반드시 끝나야 함',
    phrase: '정해진 마감까지 끝나야 합니다',
    keywords: ['마감','기한','일정'],
  },
  {
    value: 'SHARED',
    label: '여러 사람이 함께 씀',
    hint: '부서 전체나 여러 학과가 사용',
    phrase: '여러 사람이 함께 사용합니다',
    keywords: ['공유','부서','여러 사람','공동'],
  },
];

/* -------------------------------------------------------------------------- */
/* 답                                                                          */
/* -------------------------------------------------------------------------- */

export interface WizardAnswers {
  /** STEP 1. 하나만 고른다. */
  taskKind: string;
  /** STEP 2. 여러 개. */
  inputKinds: readonly string[];
  /** STEP 3. 여러 개. */
  outputKinds: readonly string[];
  /** STEP 4. */
  frequency: WorkFrequency;
  /** STEP 5. 여러 개, 비어 있어도 된다. */
  constraints: readonly string[];
  /**
   * STEP 5 의 선택 입력. **비어 있는 것이 정상이다.**
   * 고른 것만으로 부족할 때 덧붙이는 한두 문장이다.
   */
  extraNote: string;
}

export function emptyWizardAnswers(): WizardAnswers {
  return {
    taskKind: '',
    inputKinds: [],
    outputKinds: [],
    frequency: 'MONTHLY',
    constraints: [],
    extraNote: '',
  };
}

/* -------------------------------------------------------------------------- */
/* 단계                                                                        */
/* -------------------------------------------------------------------------- */

export const WIZARD_STEP_COUNT = 5;

export interface WizardStepMeta {
  step: number;
  question: string;
  /** 질문 아래 한 줄 안내 */
  guide: string;
  multiple: boolean;
  /** 다음으로 넘어가려면 하나 이상 골라야 하는가 */
  required: boolean;
}

export const WIZARD_STEPS: readonly WizardStepMeta[] = [
  {
    step: 1,
    question: '무슨 일을 하고 싶나요?',
    guide: '가장 가까운 것 하나를 골라 주세요.',
    multiple: false,
    required: true,
  },
  {
    step: 2,
    question: '어떤 자료를 사용하나요?',
    guide: '지금 손으로 다루고 있는 자료를 모두 골라 주세요.',
    multiple: true,
    required: true,
  },
  {
    step: 3,
    question: '어떤 결과가 필요하나요?',
    guide: '끝났을 때 손에 쥐고 싶은 것을 모두 골라 주세요.',
    multiple: true,
    required: true,
  },
  {
    step: 4,
    question: '얼마나 자주 하나요?',
    guide: '대략이면 됩니다. 자주 할수록 자동화 효과가 큽니다.',
    multiple: false,
    required: true,
  },
  {
    step: 5,
    question: '중요한 조건이 있나요?',
    guide: '해당하는 것이 없으면 그냥 넘어가도 됩니다.',
    multiple: true,
    required: false,
  },
];

/** 이 단계까지 답이 채워졌는가. "다음" 버튼을 열지 정한다. */
export function isStepAnswered(step: number, answers: WizardAnswers): boolean {
  switch (step) {
    case 1:
      return answers.taskKind !== '';
    case 2:
      return answers.inputKinds.length > 0;
    case 3:
      return answers.outputKinds.length > 0;
    case 4:
      return answers.frequency !== undefined;
    case 5:
      return true; // 조건은 없어도 된다
    default:
      return false;
  }
}

/** 다섯 단계가 모두 끝났는가. */
export function isWizardComplete(answers: WizardAnswers): boolean {
  return [1, 2, 3, 4, 5].every((step) => isStepAnswered(step, answers));
}

/* -------------------------------------------------------------------------- */
/* 고른 것을 문장으로                                                          */
/* -------------------------------------------------------------------------- */

function findOption(
  pool: readonly WizardOption[],
  value: string,
): WizardOption | undefined {
  return pool.find((option) => option.value === value);
}

function phrasesOf(pool: readonly WizardOption[], values: readonly string[]): string[] {
  return values
    .map((value) => findOption(pool, value)?.phrase)
    .filter((phrase): phrase is string => phrase !== undefined);
}

function labelsOf(pool: readonly WizardOption[], values: readonly string[]): string[] {
  return values
    .map((value) => findOption(pool, value)?.label)
    .filter((label): label is string => label !== undefined);
}

/** 고른 항목들의 검색어를 한 뭉치로 모은다. 중복은 지운다. */
function keywordsOf(pool: readonly WizardOption[], values: readonly string[]): string[] {
  return [
    ...new Set(values.flatMap((value) => findOption(pool, value)?.keywords ?? [])),
  ];
}

/** "가, 나, 다" — 마지막만 '와/과' 로 잇지 않는다. 목록은 쉼표가 읽기 쉽다. */
function joinKorean(parts: readonly string[]): string {
  return parts.join(', ');
}

/**
 * 수요 한 건의 초안.
 *
 * `DemandFormInput` 과 같은 이름을 쓰되 폼 타입을 그대로 가져오지 않는다.
 * domain 은 validation 계층에 의존하지 않는다.
 */
export interface DemandDraft {
  title: string;
  currentWorkDescription: string;
  mostPainfulStep: string;
  inputMaterials: string;
  desiredOutcome: string;
  requiredFeatures: string[];
  expectedBenefit: string;
  frequency: WorkFrequency;
  containsIdentifiablePersonalData: boolean;
  containsAcademicOrResearchData: boolean;
  requiresHumanApproval: boolean;
  /** 이 문장을 누가 썼는가. 화면에 그대로 표시한다. */
  source: 'RULES' | 'MODEL';
}

/**
 * 고른 것만으로 수요 초안을 조립한다.
 *
 * **모델이 없어도 여기까지는 항상 된다.** 마법사를 끝까지 갔는데 "AI 를 쓸 수
 * 없어 등록할 수 없습니다"가 나오면 안 되기 때문이다. 문장이 다소 뻣뻣해도
 * 사람이 손보면 되고, 화면에서 고칠 수 있다.
 */
export function composeDemandDraft(answers: WizardAnswers): DemandDraft {
  const task = findOption(TASK_KINDS, answers.taskKind);
  const inputs = phrasesOf(INPUT_KINDS, answers.inputKinds);
  const outputs = phrasesOf(OUTPUT_KINDS, answers.outputKinds);
  const frequency = FREQUENCY_OPTIONS.find((option) => option.value === answers.frequency);
  const constraints = answers.constraints
    .map((value) => CONSTRAINT_OPTIONS.find((option) => option.value === value))
    .filter((option): option is ConstraintOption => option !== undefined);

  const taskLabel = task?.label ?? '업무 자동화';
  const inputLabels = labelsOf(INPUT_KINDS, answers.inputKinds);
  const outputLabels = labelsOf(OUTPUT_KINDS, answers.outputKinds);

  const title =
    inputLabels.length > 0 ? `${joinKorean(inputLabels)} ${taskLabel}` : `${taskLabel} 자동화`;

  const currentWork = [
    `${frequency?.phrase ?? '필요할 때마다'} ${withJosa(task?.phrase ?? '반복되는 업무', '을를')} 하고 있습니다.`,
    inputs.length > 0 ? `다루는 자료는 ${joinKorean(inputs)}입니다.` : '',
    '지금은 이 과정을 사람이 직접 하고 있습니다.',
  ]
    .filter(Boolean)
    .join(' ');

  const painful =
    inputs.length > 0
      ? `${withJosa(joinKorean(inputs), '을를')} 하나씩 열어 확인하고 옮겨 담는 단계가 가장 오래 걸립니다.`
      : '같은 작업을 여러 번 반복하는 단계가 가장 오래 걸립니다.';

  const outcome =
    outputs.length > 0
      ? `${withJosa(joinKorean(outputs), '을를')} 자동으로 받고 싶습니다.`
      : '사람이 손대지 않아도 결과가 나오면 좋겠습니다.';

  // 기능은 "무엇을 자동으로 해야 하는가"를 한 줄씩. 개발 범위가 되는 부분이다.
  const features: string[] = [];
  if (inputLabels.length > 0) features.push(`${joinKorean(inputLabels)} 자동으로 읽어 들이기`);
  if (task) features.push(task.label);
  for (const label of outputLabels) features.push(`${label} 만들기`);
  if (constraints.some((option) => option.value === 'HIGH_VOLUME')) {
    features.push('여러 건 한 번에 처리하기');
  }
  if (constraints.some((option) => option.maps === 'humanApproval')) {
    features.push('내보내기 전에 사람이 확인하는 단계');
  }

  const benefit = `${frequency?.phrase ?? '반복해서'} 하던 ${taskLabel} 작업 시간을 줄일 수 있습니다.`;

  const note = answers.extraNote.trim();

  return {
    title: title.slice(0, 150),
    currentWorkDescription: note ? `${currentWork}\n\n${note}` : currentWork,
    mostPainfulStep: painful,
    inputMaterials: inputLabels.length > 0 ? joinKorean(inputLabels) : '',
    desiredOutcome: outcome,
    // 중복은 지우되 고른 순서는 지킨다.
    requiredFeatures: [...new Set(features)],
    expectedBenefit: benefit,
    frequency: answers.frequency,
    containsIdentifiablePersonalData: constraints.some((option) => option.maps === 'personal'),
    containsAcademicOrResearchData: constraints.some((option) => option.maps === 'academic'),
    /*
     * 항상 "필요함"으로 둔다.
     *
     * 마법사에는 "사람 확인이 필요 없다"고 말할 수 있는 선택지가 없다. 그래서
     * 고른 것으로 이 값을 끄면, 관계없는 조건(예: 처리량이 많음)을 골랐다는
     * 이유만으로 안전장치가 조용히 꺼진다. 끄는 것은 확인 화면에서 사람이
     * 직접 체크를 풀 때만 일어나야 한다.
     */
    requiresHumanApproval: true,
    source: 'RULES',
  };
}

/**
 * 고른 것을 도구 비교용 입력으로 바꾼다.
 *
 * 마법사 답에는 분류가 없다. 어느 도구와도 '같은 분류'로 걸리지 않게 비워 둔다
 * — 있지도 않은 분류 일치로 순위가 흔들리면 안 된다.
 */
export function answersAsSimilarityInput(
  answers: WizardAnswers,
  draft: DemandDraft,
): SimilarityInput {
  const taskWords = keywordsOf(TASK_KINDS, [answers.taskKind]);
  const inputWords = keywordsOf(INPUT_KINDS, answers.inputKinds);
  const outputWords = keywordsOf(OUTPUT_KINDS, answers.outputKinds);

  /*
   * 검색어를 각 칸에 함께 실어 보낸다.
   *
   * 라벨만 보내면 도구를 못 찾는다. "녹음·영상"과 "회의 녹취록 텍스트"는
   * 같은 것을 가리키는데 글자가 하나도 안 겹치기 때문이다. 실제로 이것 때문에
   * 정확한 답을 고른 사람에게도 추천이 0건이었다.
   *
   * 자리를 지켜서 넣는 것이 중요하다 — `compareLexically` 가 칸마다 다른
   * 가중치를 주므로, 입력 자료 검색어는 입력 자리에, 결과 검색어는 출력
   * 자리에 있어야 제 몫을 한다.
   */
  return {
    id: 'wizard',
    name: draft.title,
    problemStatement: [
      draft.currentWorkDescription,
      draft.mostPainfulStep,
      ...taskWords,
    ].join(' '),
    keyFeatures: [...draft.requiredFeatures, ...taskWords],
    inputData: [draft.inputMaterials, ...inputWords].join(' '),
    outputData: [draft.desiredOutcome, ...outputWords].join(' '),
    categoryName: '',
    tags: [
      ...labelsOf(TASK_KINDS, [answers.taskKind]),
      ...labelsOf(INPUT_KINDS, answers.inputKinds),
      ...labelsOf(OUTPUT_KINDS, answers.outputKinds),
      ...taskWords,
      ...inputWords,
      ...outputWords,
    ],
  };
}

/**
 * 고른 내용을 사람이 읽을 수 있게 요약한다. 확인 화면과 모델 프롬프트에 함께 쓴다.
 */
export function describeAnswers(answers: WizardAnswers): string[] {
  const lines: string[] = [];
  const task = findOption(TASK_KINDS, answers.taskKind);
  if (task) lines.push(`하고 싶은 일: ${task.label}`);

  const inputs = labelsOf(INPUT_KINDS, answers.inputKinds);
  if (inputs.length > 0) lines.push(`사용하는 자료: ${joinKorean(inputs)}`);

  const outputs = labelsOf(OUTPUT_KINDS, answers.outputKinds);
  if (outputs.length > 0) lines.push(`필요한 결과: ${joinKorean(outputs)}`);

  const frequency = FREQUENCY_OPTIONS.find((option) => option.value === answers.frequency);
  if (frequency) lines.push(`업무 주기: ${frequency.label}`);

  const constraints = labelsOf(CONSTRAINT_OPTIONS, answers.constraints);
  lines.push(`중요한 조건: ${constraints.length > 0 ? joinKorean(constraints) : '없음'}`);

  const note = answers.extraNote.trim();
  if (note) lines.push(`직접 적은 내용: ${note}`);

  return lines;
}

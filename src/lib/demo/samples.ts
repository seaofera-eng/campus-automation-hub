import type { ToolFormInput } from '@/lib/validation/tool';
import { emptyToolForm } from '@/lib/validation/tool';
import type { WizardAnswers } from '@/domain/wizard';
import { emptyWizardAnswers } from '@/domain/wizard';

/**
 * 시연용 예시 입력 (DEMO 모드 전용).
 *
 * ## 왜 필요한가
 *
 * 심사 자리에서 도구 등록 위저드 네 단계를 손으로 채우면 5분이 걸린다.
 * 그동안 보는 사람은 타자를 구경한다. **보여줘야 할 것은 입력이 아니라
 * 입력한 뒤에 일어나는 일이다** — 중복 탐지가 무엇을 잡아내는지, 위험도가
 * 어떻게 매겨지는지.
 *
 * ## 진짜 데이터가 아니라는 것을 숨기지 않는다
 *
 * 버튼은 DEMO 모드에서만 나오고, 채워진 값은 사람이 그대로 고칠 수 있다.
 * 채워 넣기만 하고 저장은 하지 않는다 — 무엇이 들어갔는지 보고 나서
 * 본인이 저장을 눌러야 한다.
 *
 * ## 마법사 예시는 "이미 있는 도구를 찾아내는" 답이다
 *
 * 마법사의 값어치는 없는 것을 새로 만드는 데 있지 않고, **이미 있는 것을
 * 찾아 주는 데** 있다. 그래서 예시 답은 데모 데이터의 회의록 도구와 겹치도록
 * 골랐다. 시연에서 "이미 이런 도구가 있습니다"가 나와야 한다.
 */

/**
 * 도구 등록 위저드에 채울 예시.
 *
 * 데모 데이터에 이미 있는 「AI 회의록 정리 도구」와 **일부러 겹치게** 만들었다.
 * 등록 직후 검토 화면에서 중복 탐지가 무엇을 잡아내는지 보여주기 위해서다.
 * 겹치지 않는 도구를 넣으면 시연의 절반이 사라진다.
 *
 * `categoryId` 는 비워 둔다 — 카테고리는 저장소마다 id 가 달라서 여기서
 * 정할 수 없다. 부르는 쪽이 화면에 있는 목록에서 채운다.
 */
export function sampleToolForm(): ToolFormInput {
  const base = emptyToolForm();

  return {
    ...base,
    name: '강의 녹화 자동 요약기',
    summary: '녹화된 강의 영상에서 자막을 뽑아 주차별 핵심 내용을 정리합니다.',
    runtimeKind: 'WEB',
    recommendedFor: ['PROFESSOR', 'STAFF'],
    tags: ['요약', '강의', '자막'],
    problemStatement:
      '수업 녹화본이 한 학기에 과목당 15개씩 쌓이는데, 조교가 하나씩 돌려 보며 요약본을 만듭니다. 영상 한 편에 30분 넘게 걸리고 학기 말에는 밀려서 못 만드는 경우가 많습니다.',

    keyFeatures: ['영상에서 자막 추출', '주차별 핵심 내용 요약', '키워드 목록 생성'],
    currentWorkflow:
      '조교가 녹화본을 처음부터 돌려 보면서 중요한 부분을 메모하고, 한글 문서로 옮겨 적어 학과 게시판에 올립니다.',
    automatedWorkflow:
      '영상을 올리면 자막을 뽑고 주차별 요약 초안을 만듭니다. 조교는 초안을 검토하고 고쳐서 올립니다.',
    inputData: '강의 녹화 영상 파일 (mp4)',
    outputData: '주차별 요약문과 키워드 목록',
    expectedUsers: '학과 조교 및 담당 교수 약 30명',
    automationLevel: 'AI_ASSISTED',

    // 강의 영상에는 학생 얼굴과 목소리가 담긴다. 시연에서 이 점이 검토
    // 화면의 위험도로 이어지는 것을 보여준다.
    classifications: base.classifications.map((entry) =>
      entry.classification === 'PERSONAL' || entry.classification === 'INTERNAL'
        ? { ...entry, inUse: true, note: '강의 영상에 학생의 발언과 얼굴이 포함될 수 있습니다.' }
        : entry,
    ),
    sendsDataExternally: true,
    externalTransferTargets: '음성 인식 API (자막 추출). 영상 원본은 교내에만 두고 음성만 전송합니다.',
    hasExecutionLog: true,
    requiresHumanApproval: true,

    serviceUrl: 'https://lecture-summary.demo.university.test',
    repositoryUrl: 'https://git.demo.university.test/lecture-summary',

    versionLabel: 'v1.0',
    changeNote: '첫 등록입니다.',
  };
}

/**
 * 맞춤 AI 찾기 마법사에 채울 예시 답.
 *
 * **회의록 정리 도구가 검색되도록** 골랐다 — 녹음·영상을 요약문으로 바꾸는
 * 일이다. 시연에서 "이미 이런 도구가 있습니다"가 나와야 마법사의 값어치가
 * 드러난다.
 *
 * 5단계 조건은 비워 둔다. 조건을 고르면 초안 문장이 길어져서 결과 화면에서
 * 봐야 할 것(추천된 도구)이 밀려난다.
 */
export function sampleWizardAnswers(): WizardAnswers {
  return {
    ...emptyWizardAnswers(),
    taskKind: 'SUMMARIZE',
    inputKinds: ['AUDIO', 'HWP_DOC'],
    outputKinds: ['SUMMARY', 'DOCUMENT'],
    frequency: 'WEEKLY',
    constraints: [],
    extraNote: '',
  };
}

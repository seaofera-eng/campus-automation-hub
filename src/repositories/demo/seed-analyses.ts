import type {
  DemandAnalysis,
  DuplicateAnalysis,
  QualityReview,
  RiskAnalysis,
} from '@/domain/analysis/types';

/**
 * 미리 돌려 둔 AI 분석 결과.
 *
 * ⚠️ **이 파일은 `pnpm ai:analyze` 가 생성합니다. 손으로 고치지 마세요.**
 *    다음 실행 때 통째로 덮어씁니다.
 *
 * ## 왜 파일에 넣어 두는가
 *
 * 시연 자리에서 API 키와 망에 기대고 싶지 않습니다. 분석은 미리 돌려 두고,
 * 시연에서는 저장된 것만 읽습니다. `pnpm demo:reset` 을 해도 그대로 살아납니다.
 *
 * 미리 돌렸다는 것과 지어냈다는 것은 다릅니다. 여기 있는 값은 전부 실제 모델이
 * 실제 등록 내용을 보고 낸 판단이고, 어느 모델이 언제 냈는지가 각 항목의
 * `provenance` 에 붙어 화면에 그대로 표시됩니다.
 *
 * 생성 시각: 2026-08-26T07:00:37.887Z
 */

/*
 * id 들이 `as unknown as` 를 거치는 이유: 도메인의 id 는 브랜드 타입인데
 * JSON 으로 한 번 왕복하면 그 표시가 벗겨집니다. 값 자체는 타입이 붙은 코드가
 * 만든 것이라 모양은 맞습니다.
 */

export const SEEDED_DUPLICATE_ANALYSES = [
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000001",
    "toolId": "00000006-0000-4000-8000-000000000001",
    "findings": [
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000007",
        "verdict": "NEAR_IDENTICAL",
        "score": 90,
        "overlapping": [
          "회의 녹취록을 요약하고 담당자별 할 일로 정리해 줍니다. / 녹음한 회의 내용을 정리하고 누가 무엇을 하기로 했는지 뽑아 줍니다.",
          "결정사항과 보류사항 구분 / 정한 것과 미룬 것 나누기",
          "담당자별 후속 과업 목록 추출 / 사람별로 맡은 일 뽑아내기",
          "회의록 서식(내부 표준) 자동 적용 / 학과 회의록 양식에 맞춰 내보내기",
          "inputData: 회의 녹취록 텍스트, 참석자 명단 / 회의 녹음 파일 또는 받아쓴 글, 참석자 목록",
          "outputData: 요약 회의록(서식 적용), 담당자별 후속 과업 목록 / 정리된 회의 기록, 사람별 할 일 목록",
          "automationLevel 모두 HUMAN_IN_THE_LOOP, runtimeKind 모두 WEB, categoryName 모두 문서·회의",
          "dataClassifications 모두 INTERNAL, PERSONAL, sendsDataExternally 모두 false"
        ],
        "distinct": [
          "새 도구는 입력이 '회의 녹취록 텍스트'와 '회의 안건'이고, 기존 도구는 '회의 녹음 파일 또는 받아쓴 글'로 녹음 파일을 글로 옮기는 단계까지 포함",
          "새 도구는 '안건별 논의 내용 요약', 기존 도구는 '주제별로 묶기'",
          "서식 기준이 새 도구는 '내부 표준' 서식, 기존 도구는 '학과 회의록 양식'",
          "배포 방식이 새 도구는 '이메일 배포', 기존 도구는 '참석자에게 공유'"
        ],
        "recommendation": "USE_EXISTING",
        "explanation": "두 도구는 회의 내용을 넣으면 요약된 회의록과 사람별 할 일 목록을 만들어 주고, 담당자가 확인한 뒤 참석자에게 보내는 흐름까지 사실상 같습니다. 다루는 자료의 민감도 구분, 사용 방식(웹), 사람이 최종 확인하는 방식도 동일합니다. 차이는 넣는 자료가 글로 옮긴 녹취록인지 녹음 파일인지, 그리고 적용하는 회의록 양식이 전교 표준인지 학과 양식인지 정도입니다. 이 정도는 기존 도구에 '녹취록 텍스트 붙여넣기' 입력과 '내부 표준 서식' 선택을 추가하면 해결되는 수준이므로, 새로 만들기보다 기존 도구를 쓰는 편이 낫습니다.",
        "lexicalOverlap": 2.3
      }
    ],
    "comparedCount": 6,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:57:55.665Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000007",
    "toolId": "00000006-0000-4000-8000-000000000007",
    "findings": [
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000001",
        "verdict": "NEAR_IDENTICAL",
        "score": 88,
        "overlapping": [
          "결정사항과 보류사항 구분 / 정한 것과 미룬 것 나누기",
          "담당자별 후속 과업 목록 추출 / 사람별로 맡은 일 뽑아내기",
          "회의록 서식(내부 표준) 자동 적용 / 학과 회의록 양식에 맞춰 내보내기",
          "inputData: 회의 녹취록 텍스트, 참석자 명단 / 회의 녹음 파일 또는 받아쓴 글, 참석자 목록",
          "outputData: 요약 회의록(서식 적용), 담당자별 후속 과업 목록 / 정리된 회의 기록, 사람별 할 일 목록",
          "automationLevel: HUMAN_IN_THE_LOOP, runtimeKind: WEB, categoryName: 문서·회의 모두 동일"
        ],
        "distinct": [
          "새 도구: 녹음 파일을 글로 옮기고 주제별로 묶기 (기존 도구는 녹취록 텍스트를 붙여넣는 방식)",
          "서식 기준이 새 도구는 '학과 회의록 양식', 기존 도구는 '내부 표준' 서식"
        ],
        "recommendation": "MERGE_INTO_EXISTING",
        "explanation": "두 도구는 회의 내용을 받아 요약과 담당자별 할 일을 뽑아내고 정해진 회의록 양식으로 내보내는, 사실상 같은 일을 같은 방식으로 합니다. 넣는 자료(녹취록/참석자 명단)와 나오는 결과(요약 회의록, 담당자별 과업)도 거의 같고, 사람이 확인해 고치는 절차와 사용 환경도 동일합니다. 다른 점은 새 도구가 녹음 파일을 직접 글로 옮겨 주는 단계를 포함한다는 것과, 양식이 학과 회의록 기준이라는 점뿐입니다. 따라서 새로 따로 만들기보다 기존 회의록 정리 도구에 '녹음 파일 받아쓰기' 기능과 '학과 양식 선택'을 더해 하나로 운영하는 편이 낫습니다.",
        "lexicalOverlap": 2.3
      }
    ],
    "comparedCount": 6,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:57:53.486Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000002",
    "toolId": "00000006-0000-4000-8000-000000000002",
    "findings": [],
    "comparedCount": 6,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:57:42.526Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000003",
    "toolId": "00000006-0000-4000-8000-000000000003",
    "findings": [
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000004",
        "verdict": "RELATED",
        "score": 25,
        "overlapping": [
          "automatedWorkflow에 '담당자 검수 → 게시판 등록 → 이메일 안내'가 포함되어, 안내 메일을 보내는 단계가 겹칩니다",
          "두 도구 모두 공개·대외 전송이 있는 웹 방식입니다(sendsDataExternally: true, runtimeKind: WEB)"
        ],
        "distinct": [
          "신청 도구의 출력은 '이메일 제목과 본문 초안'이고, 기존 도구의 출력은 '핵심 조건 요약표, 분야 분류 결과'입니다",
          "신청 도구의 입력은 '안내 목적, 대상자 구분, 마감일 등 조건'이고, 기존 도구의 입력은 '연구과제 공고문(PDF 또는 텍스트), 공고 원문 링크'입니다",
          "기존 도구는 공고문에서 핵심 항목을 추출하는 일이고, 신청 도구는 상황별 문구를 새로 작성하는 일입니다"
        ],
        "recommendation": "PROCEED",
        "explanation": "두 도구 모두 마지막에 이메일로 안내한다는 점만 닿아 있습니다. 기존 도구는 이미 있는 공고문을 읽어 요약표를 만들어 주는 것이고, 새 도구는 조건을 입력하면 메일 문안을 지어 주는 것이어서 넣는 것도 나오는 것도 다릅니다. 굳이 합칠 이유는 없어 보이며, 연구과제 안내 메일을 쓸 때 새 도구를 이어 쓰면 되겠다는 정도의 관계입니다.",
        "lexicalOverlap": 1.3
      },
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000001",
        "verdict": "RELATED",
        "score": 18,
        "overlapping": [
          "기존 도구의 automatedWorkflow 마지막에 '이메일 배포'가 있어, 메일로 알리는 단계가 겹칩니다",
          "두 도구 모두 초안을 만들고 담당자가 확인·수정하는 방식입니다"
        ],
        "distinct": [
          "기존 도구의 입력은 '회의 녹취록 텍스트, 참석자 명단, 회의 안건'이고, 신청 도구의 입력은 '안내 목적, 대상자 구분, 마감일 등 조건'입니다",
          "기존 도구의 출력은 '요약 회의록(서식 적용), 담당자별 후속 과업 목록'이고, 신청 도구의 출력은 '이메일 제목과 본문 초안'입니다",
          "기존 도구는 대외 전송이 없고(sendsDataExternally: false), 신청 도구는 있습니다"
        ],
        "recommendation": "PROCEED",
        "explanation": "회의 내용을 정리하는 일과 안내 메일 문안을 짓는 일은 서로 다른 작업입니다. 겹치는 부분은 결과물을 메일로 보낸다는 마지막 단계뿐이라 별개 도구로 봐도 무리가 없습니다.",
        "lexicalOverlap": 1.7
      }
    ],
    "comparedCount": 6,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:02.196Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000004",
    "toolId": "00000006-0000-4000-8000-000000000004",
    "findings": [
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000001",
        "verdict": "RELATED",
        "score": 25,
        "overlapping": [
          "요약",
          "담당자 확인 및 수정 → 이메일 배포 / 담당자 검수 → 게시판 등록 → 이메일 안내",
          "HUMAN_IN_THE_LOOP"
        ],
        "distinct": [
          "새 도구 입력: 연구과제 공고문(PDF 또는 텍스트), 공고 원문 링크 / 기존 입력: 회의 녹취록 텍스트, 참석자 명단, 회의 안건",
          "새 도구 출력: 핵심 조건 요약표, 분야 분류 결과 / 기존 출력: 요약 회의록(서식 적용), 담당자별 후속 과업 목록",
          "분야: 연구지원 vs 문서·회의"
        ],
        "recommendation": "PROCEED",
        "explanation": "둘 다 긴 글을 줄여 주고 사람이 확인한 뒤 메일로 알린다는 흐름은 닮아 있습니다. 다만 다루는 문서가 회의 녹취록과 연구과제 공고문으로 전혀 다르고, 뽑아내는 항목도 담당자별 할 일 대 지원자격·접수기한으로 다릅니다. 같은 문제를 푸는 도구로 보기는 어려워 그대로 진행해도 됩니다.",
        "lexicalOverlap": 1.3
      },
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000005",
        "verdict": "RELATED",
        "score": 22,
        "overlapping": [
          "원문 링크 병기 / 원문 링크 제공",
          "외부로 데이터가 나가는 점(sendsDataExternally: true)",
          "공개 자료를 다루는 점(PUBLIC)"
        ],
        "distinct": [
          "새 도구는 공고문에서 지원자격·지원규모·접수기한을 뽑아 요약표를 만듦",
          "기존 도구는 사용자 질문에 근거 조항을 붙여 답변함(자연어 질문 검색)",
          "대상 문서: 연구과제 공고문 vs 학칙·지침 원문"
        ],
        "recommendation": "PROCEED",
        "explanation": "두 도구 모두 문서를 근거로 삼고 원문 링크를 함께 보여 준다는 점이 비슷합니다. 그러나 한쪽은 질문에 답하는 방식이고, 새 도구는 공고문에서 정해진 항목을 뽑아 요약표를 만들어 게시하는 방식입니다. 쓰는 상황이 달라 겹침으로 보지 않아도 됩니다.",
        "lexicalOverlap": 3.3
      },
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000006",
        "verdict": "RELATED",
        "score": 15,
        "overlapping": [
          "분류 기능(연구 분야별 분류 / 문의 유형 분류)",
          "담당자 확인 단계를 두는 점"
        ],
        "distinct": [
          "새 도구는 공고문을 요약하는 것이 주목적이고 분류는 부가 항목",
          "기존 도구 입력은 문의 본문, 출력은 문의 유형과 담당 부서 제안",
          "기존 도구는 개인·상담 정보를 다루고 외부로 내보내지 않음"
        ],
        "recommendation": "PROCEED",
        "explanation": "'분류'라는 낱말이 겹치지만, 새 도구는 공고문의 연구 분야를 갈라 놓는 정도이고 기존 도구는 학생 문의를 어느 부서로 넘길지 정하는 일입니다. 다루는 자료와 목적이 달라 별개로 보아도 무리가 없습니다.",
        "lexicalOverlap": 4.4
      }
    ],
    "comparedCount": 6,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:15.563Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000005",
    "toolId": "00000006-0000-4000-8000-000000000005",
    "findings": [
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000006",
        "verdict": "RELATED",
        "score": 28,
        "overlapping": [
          "사용자 질문 / 문의 본문을 받아 처리한다는 점",
          "반복 문의로 담당자 부담이 크다는 문제의식(신규: '규정 문의 전화가 반복되고', 기존: '문의가 여러 창구로 들어와 담당 부서를 찾는 데 시간이 걸리고')"
        ],
        "distinct": [
          "신규는 '답변 문장, 근거 조항, 원문 링크'를 내놓고, 기존은 '문의 유형, 담당 부서 제안'을 내놓습니다",
          "기존은 문의를 어느 부서로 보낼지 정하는 도구이고, 신규는 학칙·지침 원문에서 답을 찾아 주는 도구입니다",
          "기존 데이터는 '개인·상담' 성격이고, 신규는 '공개·내부' 성격의 규정 원문입니다"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "둘 다 학생·교직원 문의를 덜어주는 목적이지만 하는 일이 다릅니다. 하나는 문의를 어느 부서로 넘길지 판단하고, 다른 하나는 규정 내용 자체에 답을 줍니다. 다만 창구에서 문의가 들어왔을 때 '규정 질문이면 챗봇, 그 밖이면 분류 도구'처럼 안내 순서를 정해두면 이용자가 헷갈리지 않습니다.",
        "lexicalOverlap": 2.4
      },
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000004",
        "verdict": "RELATED",
        "score": 22,
        "overlapping": [
          "긴 원문에서 필요한 내용을 뽑아 안내하고 '원문 링크'를 함께 보여 준다는 점"
        ],
        "distinct": [
          "기존은 '연구과제 공고문(PDF 또는 텍스트)'을 다루고, 신규는 '학칙·지침 원문'을 다룹니다",
          "기존은 담당자가 요약을 만들어 게시판에 올리는 흐름이고, 신규는 이용자가 직접 질문해서 답을 찾는 흐름입니다",
          "기존 결과물은 '핵심 조건 요약표, 분야 분류 결과'이고 신규는 질문에 대한 '답변 문장, 근거 조항'입니다"
        ],
        "recommendation": "PROCEED",
        "explanation": "둘 다 원문을 정리해 보여 주고 링크를 같이 붙여 준다는 점만 닮았습니다. 다루는 문서와 사용 방식이 서로 달라 하나로 합칠 필요는 없어 보입니다. 그대로 진행해도 무리가 없습니다.",
        "lexicalOverlap": 3.3
      }
    ],
    "comparedCount": 6,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:13.733Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000006",
    "toolId": "00000006-0000-4000-8000-000000000006",
    "findings": [
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000005",
        "verdict": "RELATED",
        "score": 30,
        "overlapping": [
          "문의",
          "규정 문의 전화가 반복되고, 담당자마다 안내 내용이 조금씩 달라 재확인이 필요한 경우가 있었습니다.",
          "불확실 시 문의 안내"
        ],
        "distinct": [
          "새 도구 출력: 문의 유형, 담당 부서 제안 / 기존 도구 출력: 답변 문장, 근거 조항, 원문 링크",
          "새 도구 입력: 문의 본문 / 기존 도구 입력: 학칙·지침 원문, 사용자 질문",
          "새 도구 처리: 문의 접수 → 유형 자동 분류 → 담당자 확인 → 이관 / 기존 도구 처리: 챗봇에 질문 → 근거 조항과 함께 답변 확인",
          "새 도구 분류: 분류·라우팅 / 기존 도구 분류: 정보 검색",
          "새 도구 취급 정보: PERSONAL, COUNSELING / 기존 도구: PUBLIC, INTERNAL"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "두 도구 모두 '학생이 보낸 문의'를 다루기는 하지만 하는 일이 다릅니다. 새로 신청한 도구는 문의 내용을 보고 어떤 유형인지 가려내 어느 부서로 보낼지 제안하는 역할이고, 기존 규정 검색 챗봇은 규정에 관한 질문에 근거 조항을 붙여 바로 답을 주는 역할입니다. 들어가는 자료와 나오는 결과가 서로 다르므로 같은 도구로 합칠 필요는 없습니다. 다만 실제 창구에서는 '규정 관련 질문이면 챗봇으로 바로 답변, 그 밖의 문의는 분류 도구로 부서 배정' 같은 사용 순서를 정해 두는 것이 좋겠습니다. 그렇지 않으면 규정 문의가 분류 도구를 거쳐 다시 이관되는 중복이 생길 수 있습니다. 또한 새 도구는 상담·개인 정보를 다루므로 열람 범위를 별도로 확인할 필요가 있습니다.",
        "lexicalOverlap": 2.4
      }
    ],
    "comparedCount": 6,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:17.952Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  }
] as unknown as DuplicateAnalysis[];

export const SEEDED_RISK_ANALYSES = [
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000001",
    "suggestedLevel": "MEDIUM",
    "summary": "회의 참석자 명단 등 개인 식별 정보를 다루지만, 성적·상담·인사 기록이나 연구보안 정보는 포함되지 않고 외부 전송도 없다고 명시되어 있습니다. 자동화 수준이 HUMAN_IN_THE_LOOP로 작성자가 초안을 확인·수정한 뒤 배포하므로 고위험 요소는 확인되지 않습니다. 다만 개인정보가 포함된 회의록을 다루는 만큼 보관기간·접근통제·실행로그에 대한 기재가 없어 등록 시 보완 확인이 필요하여 MEDIUM으로 봅니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": true,
        "reason": "참석자 명단 등 개인 식별 가능한 정보를 입력으로 처리하며 데이터 분류에도 개인정보가 포함되어 있습니다.",
        "evidence": "\"inputData\": \"회의 녹취록 텍스트, 참석자 명단, 회의 안건\" / \"dataClassifications\": [\"INTERNAL\", \"PERSONAL\"]"
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록을 다룬다는 서술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "보안과제나 미공개 연구자료에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": false,
        "reason": "외부 전송 없음으로 등록되어 있습니다.",
        "evidence": "\"sendsDataExternally\": false"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "국외 리전 저장에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간·파기 절차에 관한 서술 자체가 없어 미설정으로 단정할 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "권한 구분 부재를 확인할 서술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 관련 서술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "작성자 확인 단계를 거친 뒤 배포되는 사람 개입형 절차입니다.",
        "evidence": "\"요약·과업 초안 자동 생성 → 작성자 확인 및 수정 → 이메일 배포\" / \"automationLevel\": \"HUMAN_IN_THE_LOOP\""
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가와 무관한 회의록 정리 도구입니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출이나 결재 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 배포는 작성자 확인 후 이루어지며 교외 수신자 자동 발송이라는 서술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 삭제나 덮어쓰기 기능에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 권한 사용에 관한 서술이 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [
      {
        "code": "USES_PERSONAL_DATA",
        "description": "수집 항목 최소화, 처리 목적 명시, 개인정보 담당 부서 사전 검토",
        "mandatory": false
      }
    ],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:38.942Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000007",
    "suggestedLevel": "MEDIUM",
    "summary": "회의 녹음과 참석자 목록 등 개인 식별 가능 정보를 처리하지만, 외부 전송이 없고 작성자가 초안을 검토한 뒤 공유하는 사람 확인 구조입니다. 성적·인사·연구보안 정보나 원본 삭제·관리자 권한 같은 고위험 요소는 확인되지 않아 MEDIUM으로 판단했습니다. 다만 보관기간·접근통제·실행 로그에 대한 기재가 없으므로 등록 시 보완 확인이 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": true,
        "reason": "참석자 목록과 사람별 할 일 등 개인 식별 정보를 다루며 데이터 분류에 PERSONAL이 포함됨",
        "evidence": "\"inputData\": \"회의 녹음 파일 또는 받아쓴 글, 참석자 목록\" / \"dataClassifications\": [\"INTERNAL\", \"PERSONAL\"]"
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록을 다룬다는 기재가 없음",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "보안과제나 미공개 연구자료 관련 언급이 없음",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": false,
        "reason": "외부 전송 없음으로 등록되어 있음",
        "evidence": "\"sendsDataExternally\": false"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "해외 리전 저장에 대한 기재가 없음",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간 설정 여부를 판단할 근거 문구가 등록 내용에 없음(미기재)",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근권한 구분에 대한 기재가 없어 부재로 단정할 근거가 없음",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 관련 기재가 없어 부재로 단정할 근거가 없음",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "작성자가 초안을 수정한 뒤 공유하는 사람 개입 구조",
        "evidence": "\"automationLevel\": \"HUMAN_IN_THE_LOOP\" / \"정리 초안 자동 생성 → 작성자가 손보기 → 참석자에게 공유\""
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가·불이익 결정과 무관한 회의록 정리 도구",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출이나 결재 기능이 없음",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "공유는 작성자 확인 후 이루어지며 교외 수신자 자동 발송 기재가 없음",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 녹음 파일 삭제·덮어쓰기 기능 언급이 없음",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 계정이나 광범위 권한 사용 기재가 없음",
        "evidence": ""
      }
    ],
    "requiredControls": [
      {
        "code": "USES_PERSONAL_DATA",
        "description": "수집 항목 최소화, 처리 목적 명시, 개인정보 담당 부서 사전 검토",
        "mandatory": false
      }
    ],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:39.662Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000002",
    "suggestedLevel": "LOW",
    "summary": "학과 제출 엑셀을 표준 서식으로 변환·취합하고 오류 목록을 제시하는 도구로, 외부 전송이 없고(sendsDataExternally: false) 담당자가 재요청 대상과 최종 파일을 확정하는 HUMAN_IN_THE_LOOP 방식입니다. 성적·상담·인사 기록이나 연구보안 정보, 비용 지출, 관리자 권한 사용에 해당하는 기재가 없어 위험도는 낮게 봅니다. 다만 보관기간·접근통제·실행 로그에 대한 기재가 등록 내용에 없고, 제출 엑셀에 개인식별정보가 포함될 가능성도 명시되지 않았으므로 해당 항목은 추가 확인이 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력이 '학과별 제출 엑셀 파일'로만 기재되어 있고 이름·연락처·학번 등 개인식별정보 처리에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록을 다룬다는 서술이 없습니다. 분류는 INTERNAL, ACADEMIC로만 표기되어 있습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "보안과제나 미공개 연구자료 관련 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": false,
        "reason": "외부 전송이 없다고 명시되어 있습니다.",
        "evidence": "\"sendsDataExternally\": false"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "데스크톱에서 실행되며 해외 리전 저장에 관한 언급이 없습니다.",
        "evidence": "\"runtimeKind\": \"DESKTOP\""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간·파기 절차에 관한 기재가 없어 미설정으로 단정할 근거가 없습니다(확인 필요).",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "사용자별 권한 구분 여부에 대한 서술이 없습니다(확인 필요).",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 기록 여부에 대한 서술이 없습니다(확인 필요).",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "담당자가 오류 목록을 확인하고 최종 파일을 확정하는 사람 개입 절차가 있습니다.",
        "evidence": "오류 목록 확인 → 담당자가 재요청 대상 판단 → 최종 파일 확정 / \"automationLevel\": \"HUMAN_IN_THE_LOOP\""
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가·불이익 결정에 사용된다는 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출이나 결재 승인 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 발송 기능에 대한 언급이 없습니다. 재요청 판단도 담당자가 수행합니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "제출 파일을 변환·취합해 별도의 통합 파일을 산출하며 원본 삭제·덮어쓰기 언급이 없습니다.",
        "evidence": "\"outputData\": \"통합 엑셀 파일, 오류·누락 항목 목록\""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 계정이나 광범위한 권한 사용에 대한 기재가 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:43.504Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000003",
    "suggestedLevel": "MEDIUM",
    "summary": "공개·내부 등급의 안내 목적과 대상자 구분 등 조건만 입력받아 이메일 초안을 생성하는 도구로, 성적·상담·인사 기록이나 연구보안 정보는 다루지 않고 최종 발송도 담당자가 직접 수행합니다. 다만 등록 내용에 외부 전송(sendsDataExternally: true)이 명시되어 있어 입력 조건이 외부 서비스로 전달되는 점을 고려해 MEDIUM으로 판단했습니다. 보관기간·접근통제·실행로그에 대한 기재가 없으므로 등록 단계에서 추가 확인이 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력값이 안내 목적, 대상자 구분, 마감일 등 조건으로만 기재되어 있고 이름·연락처·학번 등 식별정보 처리 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록 처리에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "연구보안 대상 정보 관련 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": true,
        "reason": "등록 내용에 외부 전송이 참으로 표시되어 있으며, AI 보조 방식으로 초안을 생성합니다.",
        "evidence": "\"automationLevel\": \"AI_ASSISTED\", \"sendsDataExternally\": true"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "저장 리전에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간이나 파기 절차에 관한 기재 자체가 없어 미설정으로 단정할 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "권한 구분 부재를 보여주는 대목이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 여부에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "담당자가 수정·확인한 뒤 직접 발송하는 절차가 명시되어 있습니다.",
        "evidence": "상황 선택 및 조건 입력 → 초안 생성 → 담당자 수정·확인 → 직접 발송"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "선발·평가·불이익 결정과 연결되는 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출이나 결재 관련 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "초안 생성까지만 담당하며 발송은 담당자가 직접 수행합니다.",
        "evidence": "담당자 수정·확인 → 직접 발송"
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "파일 삭제·덮어쓰기 기능에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 계정이나 광범위한 권한 사용에 대한 기재가 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "description": "전송 전 비식별 처리, 학습 미사용 계약 확인, 전송 대상·항목 문서화",
        "mandatory": false
      }
    ],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:58.476Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000004",
    "suggestedLevel": "MEDIUM",
    "summary": "공개된 연구과제 공고문을 입력으로 요약하는 도구로, 개인정보·성적·연구보안 정보 등 민감 데이터를 다룬다는 근거가 없습니다. 다만 'sendsDataExternally: true'로 외부 전송이 이루어지므로 전송 대상과 경로 확인이 필요하고, 최종 등록 전 담당자 검수 단계가 있어 자동 실행 위험은 낮습니다. 이에 MEDIUM으로 판단합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력·출력 데이터가 공고문과 요약표로만 기술되어 개인 식별 정보 처리 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록을 다룬다는 기술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "데이터 분류에 RESEARCH가 있으나 입력은 공개된 공고문과 원문 링크로 미공개 연구자료나 보안과제 정보라는 근거가 없습니다.",
        "evidence": "\"inputData\": \"연구과제 공고문(PDF 또는 텍스트), 공고 원문 링크\", \"dataClassifications\": [\"PUBLIC\", \"RESEARCH\"]"
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": true,
        "reason": "외부로 데이터를 전송한다고 등록되어 있으며, 공고문 자동 요약·추출 기능이 외부 처리에 의존할 가능성이 있습니다.",
        "evidence": "\"sendsDataExternally\": true"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "국외 리전 저장에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간·파기 절차에 대한 언급 자체가 없어 부재로 단정할 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근 권한 구분 여부에 대한 기술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 관련 기술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "담당자 검수 단계가 포함된 사람 개입형 자동화입니다.",
        "evidence": "\"automatedWorkflow\": \"공고문 입력 → 핵심 항목 자동 추출 → 담당자 검수 → 게시판 등록 → 이메일 안내\", \"automationLevel\": \"HUMAN_IN_THE_LOOP\""
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가·불이익 결정과 무관한 공고 요약 제공입니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출이나 결재 승인 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 안내 단계가 있으나 담당자 검수 이후이며 교외 수신자 자동 발송이라는 근거는 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 파일 삭제·덮어쓰기 기능에 대한 기술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 계정이나 광범위한 권한 사용에 대한 기술이 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "description": "전송 전 비식별 처리, 학습 미사용 계약 확인, 전송 대상·항목 문서화",
        "mandatory": false
      }
    ],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:58:59.970Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000005",
    "suggestedLevel": "MEDIUM",
    "summary": "공개·내부 등급의 학칙·지침 원문과 사용자 질문만 다루며, 성적·상담·인사 기록이나 연구보안 정보, 학생 관련 결정, 비용 지출, 파일 변경 요소는 등록 내용에서 확인되지 않습니다. 다만 'sendsDataExternally: true'로 질문 내용이 외부로 전송되고, AI가 생성한 답변을 사용자가 그대로 참고할 수 있어 오안내 가능성이 있으므로 MEDIUM으로 판단했습니다. 사용자 질문에 개인 사정이 섞여 입력되지 않도록 안내하고, 외부 전송 대상과 보관 정책을 확인할 것을 권합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력·출력 항목이 학칙·지침 원문과 질문, 답변·근거 조항으로만 기재되어 개인 식별 정보 처리 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록에 해당하는 데이터가 언급되지 않았습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "연구보안 관련 자료 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": true,
        "reason": "외부 전송이 참으로 등록되어 있고 AI 보조 방식으로 동작합니다.",
        "evidence": "\"automationLevel\": \"AI_ASSISTED\", \"sendsDataExternally\": true"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "국외 리전 저장에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간·파기 절차에 대한 기재 자체가 없어 미설정으로 단정할 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "권한 구분 부재를 명시한 대목이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "로그 부재를 확인할 수 있는 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "사용자가 답변과 근거를 확인하고 필요 시 담당자에게 문의하는 절차가 있습니다.",
        "evidence": "챗봇에 질문 → 근거 조항과 함께 답변 확인 → 필요 시 담당자 문의"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "선발·평가·불이익 결정 기능이 없고 규정 안내에 그칩니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "결재·지출 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 발송 기능 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원문은 검색·링크 제공에만 사용되며 삭제·변경 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 계정이나 광범위한 권한 사용 언급이 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "description": "전송 전 비식별 처리, 학습 미사용 계약 확인, 전송 대상·항목 문서화",
        "mandatory": false
      }
    ],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:59:01.888Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000006",
    "suggestedLevel": "HIGH",
    "summary": "문의 본문에 개인정보(PERSONAL)와 상담(COUNSELING) 성격의 민감 기록이 포함되도록 등록되어 있어 최소 HIGH 등급으로 판단합니다. 다만 자동화 수준이 HUMAN_IN_THE_LOOP이고 외부 전송이 없다고 명시되어 있어, 발송·지출·파일 변경 등 추가 위험 요소는 확인되지 않습니다. 보관기간·접근통제·실행로그에 대한 기재가 없으므로 검토 과정에서 별도 확인이 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": true,
        "reason": "데이터 분류에 개인정보가 포함되어 있습니다.",
        "evidence": "\"dataClassifications\": [\"PERSONAL\", \"COUNSELING\"]"
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": true,
        "reason": "상담 성격의 민감 기록을 다루는 것으로 등록되어 있습니다.",
        "evidence": "\"dataClassifications\": [\"PERSONAL\", \"COUNSELING\"]"
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "연구보안 정보 관련 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": false,
        "reason": "외부 전송이 없다고 명시되어 있습니다.",
        "evidence": "\"sendsDataExternally\": false"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "해외 저장에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간 미설정이라고 판단할 근거 문구가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근통제 부재를 나타내는 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 부재를 나타내는 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "담당자 확인 단계가 포함되어 있습니다.",
        "evidence": "문의 접수 → 유형 자동 분류 → 담당자 확인 → 이관"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "출력은 문의 유형과 담당 부서 제안으로, 선발·평가 결정과 무관합니다.",
        "evidence": "\"outputData\": \"문의 유형, 담당 부서 제안\""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출 관련 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 발송 기능 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "파일 삭제·변경 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 권한 사용 기재가 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [
      {
        "code": "USES_PERSONAL_DATA",
        "description": "수집 항목 최소화, 처리 목적 명시, 개인정보 담당 부서 사전 검토",
        "mandatory": false
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "description": "접근 권한을 담당자로 한정, 조회 이력 기록, 원본 반출 금지",
        "mandatory": true
      }
    ],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:59:13.818Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  }
] as unknown as RiskAnalysis[];

export const SEEDED_DEMAND_ANALYSES = [
  {
    "demandId": "00000008-0000-4000-8000-000000000001",
    "outcome": "PARTIAL",
    "findings": [
      {
        "toolId": "00000006-0000-4000-8000-000000000001",
        "score": 75,
        "coveredFeatures": [
          "회의 메모/녹취록을 넣으면 담당자별 후속 과업을 뽑아 정리",
          "참석자 명단 활용",
          "회의록 요약 및 내부 서식 적용",
          "개인정보 포함 자료를 외부로 보내지 않고 처리"
        ],
        "missingFeatures": [
          "과업별 기한(마감일) 표시",
          "담당자별 과업을 표 형태로 정리",
          "캘린더 자동 등록",
          "메신저로 담당자별 전달"
        ],
        "explanation": "요청하신 '회의 메모에서 담당자별 과업 뽑기'는 이 도구가 이미 하고 있습니다. 다만 각 과업의 기한을 함께 표시하는 부분과, 결과를 표로 보여주거나 캘린더에 넣어 주는 부분은 아직 없습니다. 기존 도구에 기한 항목을 추가하는 방식이면 비교적 적은 작업으로 해결될 것으로 보입니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000007",
        "score": 65,
        "coveredFeatures": [
          "회의 기록에서 사람별 맡은 일 뽑아내기",
          "참석자 목록 활용",
          "회의 내용 정리 및 학과 양식으로 내보내기"
        ],
        "missingFeatures": [
          "과업 기한 표시",
          "담당자별 표 형태 산출물",
          "캘린더 등록",
          "메신저 전달"
        ],
        "explanation": "녹음이나 받아쓴 글을 기준으로 사람별 할 일을 뽑아 주는 도구입니다. 요청의 핵심인 담당자별 과업 정리는 겹치지만, 기한 표시와 표 형태 정리, 캘린더 등록은 빠져 있습니다. 주로 녹음 파일을 전제로 하는 점도 메모 중심인 요청과는 약간 차이가 있습니다."
      }
    ],
    "comparedCount": 7,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:59:26.099Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "demandId": "00000008-0000-4000-8000-000000000002",
    "outcome": "COVERED",
    "findings": [
      {
        "toolId": "00000006-0000-4000-8000-000000000002",
        "score": 95,
        "coveredFeatures": [
          "서로 다른 학과 서식을 표준 서식으로 자동 변환",
          "필수 항목 누락 검사",
          "통합된 실적표와 누락·오류 목록 동시 제공",
          "중복 행·숫자 형식 오류 점검"
        ],
        "missingFeatures": [
          "누락 항목에 대한 재요청 메일 초안 자동 작성(선택 기능)"
        ],
        "explanation": "요청하신 서식 통일과 누락 항목 찾기, 통합 표 만들기가 이 도구에서 그대로 됩니다. 학과별 파일을 올리면 표준 서식으로 합쳐주고 누락·오류 목록을 함께 보여주므로, 가장 힘들다고 하신 열 맞추기 단계가 해결됩니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000003",
        "score": 30,
        "coveredFeatures": [
          "재요청 안내 메일 초안 작성"
        ],
        "missingFeatures": [
          "엑셀 서식 변환",
          "누락 항목 검출",
          "실적표 통합"
        ],
        "explanation": "선택 기능으로 적어주신 재요청 메일 초안은 이 도구로 만들 수 있습니다. 다만 취합이나 누락 확인은 하지 못하므로, 위의 취합 도구로 나온 누락 목록을 보고 이 도구로 메일 초안을 쓰는 방식으로 함께 쓰시면 됩니다."
      }
    ],
    "comparedCount": 7,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:59:22.747Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "demandId": "00000008-0000-4000-8000-000000000003",
    "outcome": "PARTIAL",
    "findings": [
      {
        "toolId": "00000006-0000-4000-8000-000000000004",
        "score": 55,
        "coveredFeatures": [
          "연구 분야별 공고 분류",
          "공고 핵심 조건(마감일 등) 추출",
          "공고 요약 후 이메일 안내"
        ],
        "missingFeatures": [
          "연구자별 관심 분야 정보 등록·관리",
          "연구자 개인에게 맞는 공고만 골라 개별 발송",
          "마감 임박 시 재알림"
        ],
        "explanation": "이 도구는 이미 공고문을 요약하고 연구 분야별로 나눠 주기 때문에 요청의 '분야별 분류'는 그대로 쓸 수 있습니다. 다만 지금은 전체 안내 방식이라, 연구자 각자의 관심 분야를 등록해 두고 그 사람에게 맞는 공고만 골라 개별로 보내 주는 기능과 마감 임박 재알림은 새로 붙여야 합니다. 개인 정보를 다루게 되므로 명단 관리와 발송 이력에 대한 보호 방안도 함께 검토가 필요합니다."
      }
    ],
    "comparedCount": 7,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:59:21.626Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "demandId": "00000008-0000-4000-8000-000000000004",
    "outcome": "COVERED",
    "findings": [
      {
        "toolId": "00000006-0000-4000-8000-000000000006",
        "score": 95,
        "coveredFeatures": [
          "문의 유형 분류",
          "담당 부서 제안",
          "유사 문의 묶기"
        ],
        "missingFeatures": [
          "접수 채널 정보를 함께 반영하는 처리",
          "자주 묻는 질문 자동 추출"
        ],
        "explanation": "요청하신 '문의 유형 분류'와 '담당 부서 제안'을 그대로 해주는 도구가 이미 있습니다. 선택 기능인 '유사 문의 묶기'도 됩니다. 다만 접수 채널 정보는 입력에 들어가 있지 않고, 자주 묻는 질문을 자동으로 뽑아주는 기능은 없습니다. 이 두 가지가 꼭 필요하면 조금 보완하면 됩니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000005",
        "score": 15,
        "coveredFeatures": [],
        "missingFeatures": [
          "문의 유형 분류",
          "담당 부서 제안"
        ],
        "explanation": "규정 관련 질문에 근거 조항과 함께 답을 찾아주는 도구입니다. 반복되는 규정 문의 자체를 줄이는 데는 도움이 되지만, 들어온 문의를 분류하거나 담당 부서를 정해주지는 않습니다."
      }
    ],
    "comparedCount": 7,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-26T06:59:28.783Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  }
] as unknown as DemandAnalysis[];

export const SEEDED_QUALITY_REVIEWS = [
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000001",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": false,
        "findings": [
          {
            "severity": "WARNING",
            "title": "AI 요약 기능과 '외부 전송 없음' 표기가 서로 맞지 않아 보입니다",
            "evidence": "이름·요약: '[예시] AI 회의록 정리 도구 / 회의 녹취록을 요약하고 담당자별 할 일로 정리해 줍니다', 자동화 절차: '요약·과업 초안 자동 생성' / 반면 보안 항목: 외부 전송 없음(sendsDataExternally=false), 실행 형태: 웹",
            "suggestion": "요약 기능을 어디서 처리하는지(내부에 설치한 도구인지, 바깥 서비스에 맡기는지) 한 줄로 밝혀 주세요. 바깥 서비스를 쓴다면 '외부 전송 없음' 표기를 고쳐야 합니다."
          },
          {
            "severity": "NOTE",
            "title": "실행 기록을 어디에 남기는지 적혀 있지 않습니다",
            "evidence": "자동화 절차: '녹취록/메모 붙여넣기 → 요약·과업 초안 자동 생성 → 작성자 확인 및 수정 → 이메일 배포' — 기록 보관에 관한 언급이 어디에도 없습니다.",
            "suggestion": "붙여넣은 녹취록과 생성된 초안이 어디에 얼마나 남는지(또는 남기지 않는지)를 덧붙여 주세요."
          }
        ]
      },
      {
        "kind": "POLICY",
        "model": "claude-sonnet-5",
        "passed": false,
        "findings": [
          {
            "severity": "BLOCKER",
            "title": "개인정보 보관기간 및 파기 절차 누락",
            "evidence": "dataClassifications에 \"PERSONAL\"이 포함되어 있으나, 보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "회의 녹취록과 참석자 명단 등 개인정보가 포함된 자료를 얼마나 보관하고 언제 삭제하는지 명시해야 합니다. 특히 회의 내용에 학생 상담 기록이나 인사 관련 논의가 포함될 경우 더 엄격한 기준이 필요합니다."
          },
          {
            "severity": "WARNING",
            "title": "외부 전송 여부 표기와 실제 처리 방식이 불일치할 가능성",
            "evidence": "sendsDataExternally는 false로 되어 있으나, automatedWorkflow에는 \"요약·과업 초안 자동 생성\"이라는 AI 처리 단계가 있음. 이 처리가 외부 AI 서비스(API)를 이용하는지, 학습에 사용되지 않는지에 대한 언급이 없음",
            "suggestion": "요약 생성에 사용되는 AI 모델이 어디에서 실행되는지(교내 서버인지 외부 클라우드 API인지) 명확히 밝히고, 외부 서비스를 이용한다면 sendsDataExternally를 true로 수정하고 데이터가 학습에 재사용되지 않는지 확인해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 기록(누가 언제 사용했는지) 관리 여부 누락",
            "evidence": "신청서 전체에 실행 이력이나 사용 기록 보관에 대한 언급이 없음",
            "suggestion": "회의록에 개인정보가 포함되므로, 누가 언제 이 도구를 사용해 어떤 자료를 처리했는지 기록을 남기고 일정 기간 보관하는 절차를 추가해야 합니다."
          },
          {
            "severity": "NOTE",
            "title": "저장 위치(국내/국외) 언급 없음",
            "evidence": "회의록과 참석자 명단 등 자료가 저장되는 위치(국내 서버인지 해외 서버인지)에 대한 언급이 없음",
            "suggestion": "자료 저장 위치를 명시하고, 국외 서버를 이용할 경우 이에 대한 안내와 이용자 동의 절차를 마련하는 것이 좋습니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-26T06:59:45.577Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000007",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": true,
        "findings": [
          {
            "severity": "NOTE",
            "title": "녹음을 글로 옮기는 방식이 적혀 있지 않음",
            "evidence": "주요 기능에 \"녹음 파일을 글로 옮기고 주제별로 묶기\"라고 적혀 있고, 보안 항목에는 \"외부 전송 없음(sendsDataExternally: false)\"으로 표시되어 있습니다. 다만 받아쓰기를 어디서 처리하는지에 대한 설명은 신청서에 없습니다.",
            "suggestion": "녹음 받아쓰기를 학교 내부 환경에서 처리하는지, 아니면 바깥 서비스를 거치는지 한 줄 덧붙여 주세요. 외부를 거친다면 보안 항목의 표시도 함께 고쳐야 합니다."
          },
          {
            "severity": "NOTE",
            "title": "실행 기록에 대한 언급이 없음",
            "evidence": "신청서에는 입력 자료(회의 녹음 파일, 참석자 목록)와 결과물(정리된 회의 기록, 사람별 할 일 목록)만 적혀 있고, 언제 누가 돌렸는지 남기는지에 대한 내용은 어디에도 없습니다.",
            "suggestion": "회의 녹음과 참석자 목록처럼 사람과 관련된 자료를 다루므로, 실행 기록을 남기는지와 남긴다면 어디에 남기는지 적어 주세요."
          },
          {
            "severity": "NOTE",
            "title": "녹음 파일과 참석자 목록의 보관 기간이 적혀 있지 않음",
            "evidence": "다루는 자료에 \"개인정보(PERSONAL)\"가 포함되어 있고 입력 자료로 \"회의 녹음 파일 또는 받아쓴 글, 참석자 목록\"을 받는다고 되어 있으나, 이 자료를 얼마나 두는지에 대한 설명은 없습니다.",
            "suggestion": "업로드한 녹음과 참석자 목록을 정리 후 지우는지, 보관한다면 얼마 동안인지 적어 주세요."
          }
        ]
      },
      {
        "kind": "POLICY",
        "model": "claude-sonnet-5",
        "passed": false,
        "findings": [
          {
            "severity": "WARNING",
            "title": "개인정보 보관기간과 파기 절차 언급 없음",
            "evidence": "dataClassifications에 PERSONAL이 포함되어 있으나, 회의 녹음 파일과 참석자 정보를 얼마나 보관하고 언제 파기하는지에 대한 언급이 없음",
            "suggestion": "녹음 파일과 정리된 회의록에 개인정보가 포함되므로 보관 기간과 파기 절차를 명시해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 기록(누가 언제 사용했는지)에 대한 언급 없음",
            "evidence": "누가 언제 이 도구를 실행했는지 기록되는지에 대한 언급이 없음",
            "suggestion": "회의 녹음이라는 민감한 자료를 다루므로 사용 이력(실행자, 실행 시각)이 남도록 하고 이를 신청서에 명시해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "음성을 글로 옮기는 처리가 어디서 이뤄지는지 설명 부족",
            "evidence": "sendsDataExternally는 false로 되어 있으나, 녹음 파일을 텍스트로 옮기는 과정이 내부에서 처리되는지에 대한 구체적인 설명이 없음",
            "suggestion": "음성 인식 처리가 내부 시스템에서만 이루어지는지, 외부로 전혀 전송되지 않는지 구체적으로 밝혀 주시면 검토에 도움이 됩니다."
          }
        ]
      }
    ],
    "disagreement": true,
    "verdict": "NEEDS_HUMAN_REVIEW",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-26T06:59:46.973Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000002",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": true,
        "findings": [
          {
            "severity": "NOTE",
            "title": "입력 자료 설명이 너무 짧아 개인정보 포함 여부를 알 수 없음",
            "evidence": "입력 자료에는 \"학과별 제출 엑셀 파일\"이라고만 적혀 있고, 다루는 자료 구분은 \"내부용, 학사\"로만 표시되어 있습니다. 어떤 항목(예: 이름·연락처 등)이 들어 있는지에 대한 언급이 신청서 어디에도 없습니다.",
            "suggestion": "제출 엑셀에 들어가는 항목을 예시로 한두 줄 적어 주면, 개인정보 포함 여부 판단이 쉬워집니다. (현재로서는 어긋남이 아니라 설명 부족입니다.)"
          },
          {
            "severity": "NOTE",
            "title": "실행 기록(누가 언제 돌렸는지)에 대한 언급이 없음",
            "evidence": "기능 설명은 \"취합 결과와 오류 목록 동시 출력\"까지이고, 산출물도 \"통합 엑셀 파일, 오류·누락 항목 목록\"뿐입니다. 실행 기록을 남기는지에 대한 내용은 신청서에 나오지 않습니다.",
            "suggestion": "제출 기간마다 여러 차례 돌리는 일이라면, 실행 시점과 담당자를 남기는지 여부를 한 줄 보태 주세요."
          }
        ]
      },
      {
        "kind": "POLICY",
        "model": "claude-sonnet-5",
        "passed": false,
        "findings": [
          {
            "severity": "WARNING",
            "title": "취합 파일의 보관기간과 파기 절차가 없음",
            "evidence": "입력데이터: 학과별 제출 엑셀 파일 / 출력데이터: 통합 엑셀 파일, 오류·누락 항목 목록 — 보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "학과별 원본 파일과 통합 결과물을 얼마나 보관하고 언제 파기하는지 절차를 명시해야 합니다. 학과 제출 자료에는 학생 성적 등 개인정보가 포함될 수 있으므로 특히 필요합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 이력(누가 언제 처리했는지) 기록에 대한 언급 없음",
            "evidence": "자동화 워크플로우: 학과별 파일 업로드 → 자동 변환·취합 → 오류 목록 확인 → 담당자가 재요청 대상 판단 → 최종 파일 확정 — 실행 기록·이력 관리에 대한 언급이 없음",
            "suggestion": "누가 언제 파일을 업로드하고 최종 확정했는지 기록이 남도록 하여, 추후 오류나 민원 발생 시 확인할 수 있도록 해야 합니다."
          },
          {
            "severity": "NOTE",
            "title": "데이터 분류에 개인정보 포함 여부가 명확하지 않음",
            "evidence": "dataClassifications: [\"INTERNAL\", \"ACADEMIC\"] — 학과 제출 자료에 학생 개인정보(성적, 학번 등)가 포함되는지에 대한 언급이 없음",
            "suggestion": "학과별 제출 엑셀에 학생 개인정보가 포함되는 경우, 데이터 분류에 개인정보 항목을 명시하고 그에 맞는 취급 기준을 적용해야 합니다."
          }
        ]
      }
    ],
    "disagreement": true,
    "verdict": "NEEDS_HUMAN_REVIEW",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-26T06:59:41.386Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000003",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": true,
        "findings": [
          {
            "severity": "NOTE",
            "title": "외부 전송을 한다고 표시했으나 어디로 보내는지 설명이 없습니다",
            "evidence": "'sendsDataExternally': true 로 표시되어 있으나, 주요 기능은 '상황별 이메일 초안 생성', '교내 표준 문구 반영', '대상자 구분에 따른 문구 조정'으로만 적혀 있어 외부로 무엇이 나가는지 언급이 없습니다.",
            "suggestion": "초안 생성에 외부 서비스를 이용하는 것이라면 어떤 종류의 서비스로 어떤 항목(입력 조건, 문구 등)이 전달되는지 한 줄 덧붙여 주세요."
          },
          {
            "severity": "NOTE",
            "title": "실행 기록에 관한 내용이 없습니다",
            "evidence": "자동화 흐름은 '상황 선택 및 조건 입력 → 초안 생성 → 담당자 수정·확인 → 직접 발송'까지만 적혀 있고, 생성 이력이나 사용 기록을 남기는지에 대한 언급이 신청서 어디에도 없습니다.",
            "suggestion": "기록을 남기는지, 남긴다면 어디에 보관하는지 적어 주시면 검토가 수월합니다."
          }
        ]
      },
      {
        "kind": "POLICY",
        "model": "claude-sonnet-5",
        "passed": false,
        "findings": [
          {
            "severity": "BLOCKER",
            "title": "외부로 데이터를 보내면서 어디로, 무슨 목적으로 보내는지 및 학습 활용 여부가 없음",
            "evidence": "sendsDataExternally: true 이지만 전송 대상이나 목적, 인공지능 학습 재사용 여부에 대한 언급이 없음",
            "suggestion": "이메일 초안 생성에 사용하는 외부 서비스명, 전송되는 데이터 범위, 해당 서비스가 입력 데이터를 모델 학습에 재사용하는지 여부를 명시해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "입력 데이터에 대한 보관기간과 파기 절차가 없음",
            "evidence": "inputData: 안내 목적, 대상자 구분, 마감일 등 조건 - 이에 대한 보관 기간이나 파기 절차 언급이 없음",
            "suggestion": "대상자 구분 등 조건 정보가 개인정보와 연결될 수 있으므로, 초안 생성 후 해당 입력 데이터를 언제까지 보관하고 어떻게 파기하는지 절차를 명시해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 이력(누가 언제 실행했는지) 기록에 대한 언급 없음",
            "evidence": "자동화된 작업 흐름에 실행 기록이나 로그에 대한 언급이 없음",
            "suggestion": "누가 언제 어떤 조건으로 초안을 생성했는지 기록을 남기는 절차를 추가해 문제 발생 시 추적할 수 있도록 해야 합니다."
          },
          {
            "severity": "NOTE",
            "title": "저장 위치가 국내인지 국외인지 언급 없음",
            "evidence": "데이터 저장 위치(국내/국외)에 대한 언급이 없음",
            "suggestion": "이메일 초안 데이터나 조건 정보가 저장되는 서버 위치(국내 또는 국외)를 명시하면 좋습니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-26T06:59:54.376Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000004",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": true,
        "findings": [
          {
            "severity": "NOTE",
            "title": "외부 전송을 한다고 했으나 어디로 보내는지 설명이 없음",
            "evidence": "보안 항목: 외부 전송 있음(sendsDataExternally: true) / 주요 기능: '지원자격·지원규모·접수기한 추출', '제출서류 목록 정리', '원문 링크 병기', '연구 분야별 분류' — 외부 서비스 이용에 대한 언급이 없음",
            "suggestion": "공고문 요약 과정에서 어떤 외부 서비스로 어떤 자료가 나가는지(예: 요약 처리 위탁, 메일 발송 경로) 한 줄이라도 적어 주세요."
          },
          {
            "severity": "NOTE",
            "title": "이메일 안내 단계가 있으나 수신자 정보가 입력 자료에 없음",
            "evidence": "자동화 후 흐름: '게시판 등록 → 이메일 안내' / 다루는 자료: '연구과제 공고문(PDF 또는 텍스트), 공고 원문 링크'",
            "suggestion": "이메일 안내에 쓰는 수신자 명단·주소를 어디서 가져오는지, 그 자료가 어떤 구분(공개/개인정보 등)에 해당하는지 보완해 주세요."
          }
        ]
      },
      {
        "kind": "POLICY",
        "model": "claude-sonnet-5",
        "passed": false,
        "findings": [
          {
            "severity": "BLOCKER",
            "title": "외부로 데이터를 보내는데 어디로 보내는지, 학습에 쓰이는지 언급이 없음",
            "evidence": "sendsDataExternally: true 이지만 어떤 외부 서비스(예: 요약 처리를 위한 AI 모델 등)로 전송되는지, 해당 서비스가 입력 데이터를 학습에 재사용하는지에 대한 설명이 전혀 없음",
            "suggestion": "외부 전송 대상 기관/서비스명, 전송 항목, 해당 서비스의 데이터 학습 활용 여부와 이를 배제하는 계약 조건을 명시해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "보관 기간 및 파기 절차에 대한 언급이 없음",
            "evidence": "inputData와 outputData에 공고문, 요약표 등이 명시되어 있으나 이 자료들의 보관 기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "공고문 원문 및 요약 결과의 보관 기간과 파기 시점, 절차를 명시해 주시기 바랍니다. 공고문 자체는 공개 정보이지만 RESEARCH 분류 데이터가 포함되어 있어 관리 기준이 필요합니다."
          },
          {
            "severity": "NOTE",
            "title": "실행 기록(누가 언제 실행했는지) 관련 언급 없음",
            "evidence": "자동화된 워크플로우 설명에 담당자 검수 단계는 있으나, 검수자·실행자 및 실행 시각 기록 여부에 대한 언급이 없음",
            "suggestion": "담당자 검수 및 자동 추출 실행 이력이 남는지, 이를 확인할 수 있는 로그 체계가 있는지 기재하면 추후 오류 확인 및 책임 소재 파악에 도움이 됩니다."
          },
          {
            "severity": "NOTE",
            "title": "저장 위치(국내/국외)에 대한 언급이 없음",
            "evidence": "데이터 저장 위치에 대한 언급이 없음",
            "suggestion": "공고문 원문 및 요약 결과가 저장되는 서버의 위치(국내/국외)를 명시해 주시기 바랍니다. RESEARCH 분류 데이터가 포함되어 있어 국외 저장 시 별도 검토가 필요합니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-26T06:59:57.937Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000005",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": true,
        "findings": [
          {
            "severity": "NOTE",
            "title": "외부로 자료를 보낸다고 표시했으나 어디로 보내는지 적혀 있지 않음",
            "evidence": "'외부 전송 여부: 있음(sendsDataExternally: true)'으로 표시되어 있으나, 주요 기능은 '자연어 질문 검색 / 근거 조항 인용 / 원문 링크 제공 / 불확실 시 문의 안내'로만 적혀 있고 입력 자료도 '학칙·지침 원문, 사용자 질문'까지만 적혀 있어 외부로 나가는 대상이나 보내는 곳에 대한 언급이 없습니다.",
            "suggestion": "질문 내용이 외부 어느 서비스로 전달되는지, 학칙 원문도 함께 보내지는지 한 줄로 보완해 주세요. 어긋남은 아니지만 검토에 필요한 정보가 비어 있습니다."
          },
          {
            "severity": "NOTE",
            "title": "사용자 질문의 취급 등급이 명확하지 않음",
            "evidence": "다루는 자료 등급은 '공개, 내부용'으로만 적혀 있는데, 입력 자료에는 '사용자 질문'이 포함되어 있습니다. 질문에 학번이나 개인 사정이 담길 수 있는지에 대한 설명은 신청서에 없습니다.",
            "suggestion": "사용자 질문에 개인을 알 수 있는 내용이 들어갈 수 있는지, 들어갈 경우 어떻게 처리하는지 적어 두면 좋겠습니다."
          }
        ]
      },
      {
        "kind": "POLICY",
        "model": "claude-sonnet-5",
        "passed": false,
        "findings": [
          {
            "severity": "BLOCKER",
            "title": "외부로 데이터를 보내면서 전송 대상과 AI 학습 활용 여부가 없음",
            "evidence": "\"sendsDataExternally\": true 이지만 어디로 보내는지, 학습에 사용되는지에 대한 언급이 없음",
            "suggestion": "질문 내용과 규정 원문이 어느 외부 서비스로 전송되는지, 해당 서비스가 이 데이터를 자체 모델 학습에 활용하지 않는다는 확인(계약 조건 등)을 명시해 주세요."
          },
          {
            "severity": "WARNING",
            "title": "사용자 질문 데이터의 보관기간과 파기 절차가 없음",
            "evidence": "inputData에 \"사용자 질문\"이 포함되어 있으나 보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "사용자가 입력한 질문에 개인 신상이나 특정 학생 관련 내용이 포함될 수 있으므로, 질문 로그의 보관 기간과 파기 절차를 정해 명시해 주세요."
          },
          {
            "severity": "WARNING",
            "title": "실행 기록(누가 언제 질문했는지)에 대한 언급이 없음",
            "evidence": "자연어 질문 검색 기능이 있으나 사용 이력 기록(로그) 보관 여부에 대한 언급이 없음",
            "suggestion": "오남용이나 문의 확인이 필요할 경우를 대비해 누가 언제 어떤 질문을 했는지 최소한의 접속 기록을 남기고 이를 어떻게 관리하는지 기재해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "저장 위치(국내/국외)에 대한 언급이 없음",
            "evidence": "데이터 저장 위치에 대한 언급이 없음",
            "suggestion": "학칙·지침 원문 및 질문 로그가 저장되는 서버의 위치(국내 또는 국외)를 명시해 주시면 검토에 도움이 됩니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-26T07:00:37.869Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000006",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": false,
        "findings": [
          {
            "severity": "WARNING",
            "title": "주요 기능에 있는 '유사 문의 묶기'가 산출물에 나타나지 않습니다",
            "evidence": "주요 기능: \"문의 유형 분류\", \"담당 부서 제안\", \"유사 문의 묶기\" / 산출물: \"문의 유형, 담당 부서 제안\" / 자동화 후 흐름: \"문의 접수 → 유형 자동 분류 → 담당자 확인 → 이관\"",
            "suggestion": "유사 문의를 묶은 결과가 실제로 나오는 것이라면 산출물과 자동화 후 흐름에 그 단계를 함께 적어 주시고, 아직 하지 않는 기능이라면 주요 기능에서 빼 주세요."
          },
          {
            "severity": "NOTE",
            "title": "다루는 자료는 개인정보·상담정보인데 입력 설명은 '문의 본문' 한 줄뿐입니다",
            "evidence": "다루는 자료 구분: \"개인정보\", \"상담정보\" / 입력 자료: \"문의 본문\"",
            "suggestion": "문의 본문 안에 이름·학번·연락처나 상담 내용이 함께 들어오는 것이라면 입력 자료 설명에 그 점을 적어 주세요. 반대로 본문만 보고 개인정보는 다루지 않는다면 자료 구분을 다시 확인해 주세요."
          }
        ]
      },
      {
        "kind": "POLICY",
        "model": "claude-sonnet-5",
        "passed": false,
        "findings": [
          {
            "severity": "BLOCKER",
            "title": "개인정보 및 상담 기록의 보관기간·파기 절차가 없음",
            "evidence": "dataClassifications에 PERSONAL, COUNSELING이 명시되어 있으나 보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "문의 본문에 포함된 개인정보와 상담 관련 내용을 얼마나 보관하고 언제 어떻게 파기하는지 절차를 명시해야 합니다. 특히 상담 기록은 일반 개인정보보다 더 엄격한 접근 통제와 보관 기준이 필요합니다."
          },
          {
            "severity": "WARNING",
            "title": "누가 언제 이 도구를 사용했는지 남는 기록에 대한 언급이 없음",
            "evidence": "실행 이력이나 사용 기록에 대한 언급이 없음",
            "suggestion": "문의 분류 및 담당 부서 제안 작업이 언제, 누구에 의해 확인·처리되었는지 기록이 남는지 명시해야 합니다. 특히 상담 관련 문의는 열람 이력 관리가 중요합니다."
          },
          {
            "severity": "WARNING",
            "title": "상담 관련 문의에 대한 접근 권한 제한이 명시되지 않음",
            "evidence": "dataClassifications에 COUNSELING이 포함되어 있으나, 이 도구를 사용하거나 결과를 열람할 수 있는 사람의 범위에 대한 언급이 없음",
            "suggestion": "상담 관련 문의는 일반 행정 문의와 달리 열람 가능한 담당자 범위를 제한하고, 이를 신청서에 명시할 필요가 있습니다."
          },
          {
            "severity": "NOTE",
            "title": "도구가 접근하는 시스템이나 권한 범위에 대한 설명이 없음",
            "evidence": "runtimeKind가 SCRIPT로 되어 있으나 실행 시 어떤 시스템(예: 문의 접수 게시판, 부서 배정 시스템)에 접근하는지, 그 권한 범위가 어디까지인지에 대한 언급이 없음",
            "suggestion": "스크립트가 접근하는 데이터베이스나 시스템의 범위와 권한 수준을 명시하면 검토에 도움이 됩니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-26T07:00:08.129Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  }
] as unknown as QualityReview[];

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
 * 생성 시각: 2026-08-28T07:06:59.144Z
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
        "score": 92,
        "overlapping": [
          "정한 것과 미룬 것 나누기 / 결정사항과 보류사항 구분",
          "사람별로 맡은 일 뽑아내기 / 담당자별 후속 과업 목록 추출",
          "학과 회의록 양식에 맞춰 내보내기 / 회의록 서식(내부 표준) 자동 적용",
          "입력: 회의 녹음 파일 또는 받아쓴 글, 참석자 목록 / 회의 녹취록 텍스트, 참석자 명단",
          "출력: 정리된 회의 기록, 사람별 할 일 목록 / 요약 회의록(서식 적용), 담당자별 후속 과업 목록",
          "둘 다 HUMAN_IN_THE_LOOP, WEB, 문서·회의, 외부 전송 없음"
        ],
        "distinct": [
          "기존 도구는 '녹음 파일을 글로 옮기고' 단계가 있으나 신청 도구는 녹취록 텍스트를 붙여넣는 방식",
          "신청 도구는 회의 안건을 입력받아 '안건별 논의 내용 요약'을 함"
        ],
        "recommendation": "MERGE_INTO_EXISTING",
        "explanation": "두 도구는 회의 내용을 넣으면 정해진 회의록 양식으로 요약해 주고 사람별 할 일을 뽑아 준다는 점이 사실상 같습니다. 넣는 자료(참석자 목록과 회의 내용)와 나오는 결과(정리된 회의록, 담당자별 할 일)가 일치하고, 사람이 초안을 확인해 고친 뒤 참석자에게 공유하는 흐름도 같습니다. 차이는 기존 도구가 녹음 파일을 글로 옮겨 주는 단계를 포함하는 반면 신청 도구는 이미 글로 된 녹취록을 붙여넣고 안건별로 나누어 요약한다는 정도입니다. 별도 도구로 두기보다 기존 도구에 '녹취록 텍스트 붙여넣기'와 '안건 입력에 따른 안건별 요약'을 더해 하나로 합치는 편이 낫습니다.",
        "lexicalOverlap": 2.3
      },
      {
        "candidateToolId": "204f8e90-25ae-4cdf-8546-0404cf5e1ef6",
        "verdict": "RELATED",
        "score": 35,
        "overlapping": [
          "말로 진행된 내용을 글로 바꾸어 요약 초안을 만들고 사람이 검토·수정한다는 점(영상에서 자막을 뽑고 주차별 요약 초안을 만듭니다 / 요약·과업 초안 자동 생성 → 작성자 확인 및 수정)",
          "같은 분류인 문서·회의"
        ],
        "distinct": [
          "대상이 강의 녹화 영상 파일(mp4)이고, 신청 도구는 회의 녹취록 텍스트와 참석자 명단",
          "결과가 주차별 요약문과 키워드 목록이며, 담당자별 후속 과업 목록이나 회의록 서식은 없음",
          "기존 도구는 외부 전송이 있고 신청 도구는 없음"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "둘 다 말로 진행된 내용을 요약해 준다는 점은 닮았지만, 다루는 자료와 결과물이 다릅니다. 기존 도구는 강의 녹화 영상을 받아 주차별 요약과 키워드를 만들고, 신청 도구는 회의 녹취록을 받아 회의록 양식의 요약과 담당자별 할 일을 만듭니다. 두 도구 모두 필요하지만 이용자가 헷갈리지 않도록 '강의 영상용'과 '회의용'임을 이름이나 안내에 분명히 적어 두면 좋겠습니다.",
        "lexicalOverlap": 1.4
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:20.242Z",
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
        "score": 92,
        "overlapping": [
          "회의 녹취록을 요약하고 담당자별 할 일로 정리해 줍니다.",
          "결정사항과 보류사항 구분",
          "담당자별 후속 과업 목록 추출",
          "회의록 서식(내부 표준) 자동 적용",
          "회의 녹취록 텍스트, 참석자 명단, 회의 안건",
          "요약 회의록(서식 적용), 담당자별 후속 과업 목록",
          "HUMAN_IN_THE_LOOP",
          "문서·회의"
        ],
        "distinct": [
          "신규: 녹음 파일을 글로 옮기고 주제별로 묶기 (기존은 녹취록 텍스트 붙여넣기부터 시작)",
          "신규: 학과 회의록 양식에 맞춰 내보내기 / 기존: 내부 표준 서식"
        ],
        "recommendation": "MERGE_INTO_EXISTING",
        "explanation": "두 도구는 회의 내용을 정리해 결정사항·보류사항을 나누고 담당자별 할 일을 뽑아 정해진 회의록 양식으로 내보내는 점까지 사실상 같습니다. 넣는 것(녹취록·참석자 명단)과 나오는 것(요약 회의록, 담당자별 과업)도 동일하며, 초안을 만든 뒤 작성자가 손보고 참석자에게 공유하는 흐름도 같습니다. 차이는 두 가지뿐입니다. 새 도구는 녹음 파일을 직접 받아 글로 옮기는 단계가 있고, 회의록 양식이 '학과 양식'이라는 점입니다. 따라서 별도 도구를 새로 만드는 대신 기존 회의록 도구에 녹음 파일 받아쓰기 기능과 학과 양식 선택을 더해 하나로 합치는 편이 낫습니다.",
        "lexicalOverlap": 2.3
      },
      {
        "candidateToolId": "204f8e90-25ae-4cdf-8546-0404cf5e1ef6",
        "verdict": "RELATED",
        "score": 38,
        "overlapping": [
          "녹음/녹화된 음성에서 글(자막)을 뽑아 요약 초안을 만드는 점",
          "작성자(조교)가 초안을 검토하고 고쳐서 공유하는 점",
          "categoryName 문서·회의",
          "dataClassifications INTERNAL, PERSONAL"
        ],
        "distinct": [
          "기존: 강의 녹화 영상 파일 (mp4) → 주차별 요약문과 키워드 목록",
          "신규: 회의 녹음 파일 또는 받아쓴 글, 참석자 목록 → 정리된 회의 기록, 사람별 할 일 목록",
          "신규: 사람별로 맡은 일 뽑아내기, 정한 것과 미룬 것 나누기",
          "기존: sendsDataExternally true / 신규: false"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "둘 다 말소리를 글로 옮겨 요약한다는 점은 비슷하지만, 다루는 대상과 결과물이 다릅니다. 기존 도구는 강의 녹화 영상을 주차별 학습 요약과 키워드로 만드는 것이고, 새 도구는 회의 녹음을 회의 기록과 사람별 할 일로 만드는 것입니다. 담당자별 업무 분담을 뽑아내는 기능은 새 도구에만 있습니다. 다만 음성을 글로 옮기는 부분이 겹치므로, 강의용과 회의용을 언제 어느 쪽으로 보낼지 안내 기준을 정해 두면 좋겠습니다.",
        "lexicalOverlap": 2.1
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:18.806Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000002",
    "toolId": "00000006-0000-4000-8000-000000000002",
    "findings": [
      {
        "candidateToolId": "49361a84-a5db-4c7c-af4f-bbb51f29fa8c",
        "verdict": "RELATED",
        "score": 20,
        "overlapping": [
          "categoryName: 데이터 취합",
          "runtimeKind: DESKTOP",
          "tags: 변환"
        ],
        "distinct": [
          "새 신청: 입력 \"학과별 제출 엑셀 파일\", 출력 \"통합 엑셀 파일, 오류·누락 항목 목록\"",
          "기존 등록: 입력 \"ㅇㄹㅇㄹ\", 출력 \"ㄹㅇㄹㅇㄹ\", 요약 \"1212\""
        ],
        "recommendation": "PROCEED",
        "explanation": "같은 분류(데이터 취합)에 있고 사용 환경도 같지만, 기존 등록 건은 요약과 문제 설명, 입력·출력이 모두 의미 없는 임시 문자열로만 채워져 있어 실제로 어떤 일을 하는 도구인지 확인할 수 없습니다. 따라서 같은 문제를 같은 방식으로 푼다고 볼 근거가 없어 새 신청은 그대로 진행해도 무리가 없습니다. 다만 기존 등록 건은 내용이 비어 있는 상태이므로 작성자에게 보완을 요청하거나 정리하는 편이 좋겠습니다.",
        "lexicalOverlap": 0
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:11.373Z",
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
          "담당자 검수 → 게시판 등록 → 이메일 안내",
          "dataClassifications: PUBLIC",
          "sendsDataExternally: true"
        ],
        "distinct": [
          "새 도구 출력: 이메일 제목과 본문 초안 / 기존 출력: 핵심 조건 요약표, 분야 분류 결과",
          "새 도구 입력: 안내 목적, 대상자 구분, 마감일 등 조건 / 기존 입력: 연구과제 공고문(PDF 또는 텍스트), 공고 원문 링크",
          "기존은 공고문 요약, 새 도구는 안내 메일 초안 작성"
        ],
        "recommendation": "PROCEED",
        "explanation": "두 도구 모두 마지막에 이메일 안내로 이어지지만, 하는 일이 다릅니다. 기존 도구는 연구과제 공고문에서 지원자격·접수기한 같은 핵심 조건을 뽑아 요약표를 만드는 것이고, 새 도구는 안내 목적과 대상자 조건을 넣어 메일 제목과 본문 초안을 만드는 것입니다. 다만 공고 안내 메일을 보낼 때 두 도구가 이어져 쓰일 수 있으니, 요약 결과를 새 도구의 입력으로 쓰는 방식을 안내해 두면 좋겠습니다.",
        "lexicalOverlap": 1.3
      },
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000005",
        "verdict": "RELATED",
        "score": 20,
        "overlapping": [
          "담당자마다 안내 내용이 조금씩 달라 재확인이 필요한 경우가 있었습니다 / 담당자마다 표현이 달라 안내가 일관되지 않았습니다",
          "자동화 수준 AI_ASSISTED, 웹에서 사용, PUBLIC·INTERNAL 자료, 외부 전송 있음"
        ],
        "distinct": [
          "기존 출력: 답변 문장, 근거 조항, 원문 링크 / 새 도구 출력: 이메일 제목과 본문 초안",
          "기존은 규정 원문을 찾아 답하는 검색, 새 도구는 조건을 받아 문서를 새로 쓰는 작성"
        ],
        "recommendation": "PROCEED",
        "explanation": "두 도구가 '담당자마다 안내가 달라진다'는 같은 고민에서 출발했지만 푸는 방식이 다릅니다. 기존 챗봇은 규정 원문에서 답을 찾아 근거 조항과 함께 보여 주는 것이고, 새 도구는 안내 목적과 대상자 조건을 받아 메일 초안을 만들어 주는 것입니다. 입력과 결과물이 서로 겹치지 않아 그대로 진행해도 됩니다.",
        "lexicalOverlap": 2.3
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:24.947Z",
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
        "candidateToolId": "00000006-0000-4000-8000-000000000005",
        "verdict": "RELATED",
        "score": 30,
        "overlapping": [
          "기존 '원문 링크 제공' / 신청 '원문 링크 병기' — 둘 다 근거가 되는 원문을 함께 보여줍니다",
          "규정집·공고문 같은 문서 원문을 입력으로 받아 이용자가 필요한 내용을 빨리 찾게 해 준다는 목적이 겹칩니다",
          "dataClassifications에 PUBLIC 포함, sendsDataExternally: true (양쪽 동일)"
        ],
        "distinct": [
          "기존 입력은 '학칙·지침 원문, 사용자 질문'이고 질문에 답하는 방식(자연어 질문 검색)이며, 신청은 공고문을 넣으면 정해진 항목을 뽑아 요약표를 만드는 방식",
          "기존 출력은 '답변 문장, 근거 조항, 원문 링크', 신청 출력은 '핵심 조건 요약표, 분야 분류 결과'",
          "기존은 '전화 또는 방문 문의' 대응, 신청은 '게시판 등록 → 이메일 안내'로 공고를 알리는 업무"
        ],
        "recommendation": "PROCEED",
        "explanation": "둘 다 문서를 다루고 원문 링크를 함께 보여준다는 공통점이 있으나, 기존 도구는 이용자가 물어본 것에 규정 조항으로 답하는 방식이고 신청 도구는 공고문에서 정해진 항목을 뽑아 게시·안내용 요약을 만드는 방식입니다. 쓰는 상황과 결과물이 달라 겹친다고 보기 어렵습니다.",
        "lexicalOverlap": 3.3
      },
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000001",
        "verdict": "RELATED",
        "score": 25,
        "overlapping": [
          "안건별 논의 내용 요약 / 지원자격·지원규모·접수기한 추출 — 둘 다 긴 문서를 읽어 핵심을 뽑아 정리하고, 담당자가 확인한 뒤 이메일로 안내하는 흐름입니다",
          "automationLevel: HUMAN_IN_THE_LOOP (양쪽 동일)"
        ],
        "distinct": [
          "기존 입력은 '회의 녹취록 텍스트, 참석자 명단, 회의 안건', 신청 입력은 '연구과제 공고문(PDF 또는 텍스트), 공고 원문 링크'",
          "기존 출력은 '요약 회의록(서식 적용), 담당자별 후속 과업 목록', 신청 출력은 '핵심 조건 요약표, 분야 분류 결과'",
          "기존은 '회의록 서식(내부 표준) 자동 적용', 신청은 '연구 분야별 분류'와 '원문 링크 병기'"
        ],
        "recommendation": "PROCEED",
        "explanation": "둘 다 '요약'을 한다는 점에서 비슷해 보이지만, 다루는 문서와 결과물이 다릅니다. 하나는 교내 회의 녹취록을 회의록 서식으로 정리하고 담당자별 할 일을 뽑는 것이고, 다른 하나는 외부 기관 연구과제 공고문에서 지원자격·지원규모·접수기한 같은 조건을 뽑아 표로 만드는 것입니다. 같은 문제를 푸는 도구로 보기는 어려워 그대로 진행해도 됩니다.",
        "lexicalOverlap": 1.3
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:37.035Z",
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
        "score": 30,
        "overlapping": [
          "반복 문의 처리 부담을 줄인다는 점: 새 도구는 \"규정 문의 전화가 반복되고\", 기존 도구는 \"문의가 여러 창구로 들어와 담당 부서를 찾는 데 시간이 걸리고\"",
          "둘 다 사용자가 보낸 질문/문의 글을 입력으로 받습니다(\"사용자 질문\" / \"문의 본문\")"
        ],
        "distinct": [
          "새 도구의 결과물은 \"답변 문장, 근거 조항, 원문 링크\"인 반면 기존 도구는 \"문의 유형, 담당 부서 제안\"입니다",
          "새 도구는 학칙·지침 원문을 근거로 답을 만들어 주고, 기존 도구는 답을 만들지 않고 담당 부서로 넘길 곳만 정합니다",
          "다루는 자료 구분도 새 도구는 공개·내부, 기존 도구는 개인·상담 정보입니다"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "둘 다 들어온 질문을 처리하지만 하는 일이 다릅니다. 새 도구는 규정 내용을 찾아 답을 주고, 기존 도구는 어느 부서가 맡을지 골라 넘깁니다. 다만 실제 창구에서는 질문 하나가 두 도구 중 어디로 가야 하는지 헷갈릴 수 있으니, '규정 내용을 묻는 질문은 챗봇, 개인 사정이 담긴 문의는 분류 도구'처럼 사용 시점을 안내문에 적어 두는 것이 좋겠습니다.",
        "lexicalOverlap": 2.4
      },
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000004",
        "verdict": "RELATED",
        "score": 22,
        "overlapping": [
          "원문을 함께 보여 주는 방식이 같습니다: 새 도구의 \"원문 링크 제공\", 기존 도구의 \"원문 링크 병기\"",
          "긴 문서에서 필요한 부분을 뽑아 알려 준다는 점"
        ],
        "distinct": [
          "다루는 문서가 다릅니다. 새 도구는 \"학칙·지침 원문\", 기존 도구는 \"연구과제 공고문(PDF 또는 텍스트)\"",
          "새 도구는 사용자가 그때그때 질문해 찾는 방식(\"챗봇에 질문 → 근거 조항과 함께 답변 확인\")이고, 기존 도구는 담당자가 미리 요약해 게시판에 올리는 방식(\"담당자 검수 → 게시판 등록 → 이메일 안내\")",
          "이용 대상과 부서가 다릅니다(학사 규정 문의 대응 vs 연구지원)"
        ],
        "recommendation": "PROCEED",
        "explanation": "원문 링크를 함께 보여 준다는 점만 닮았고, 대상 문서와 쓰는 방식이 다릅니다. 하나는 학사 규정을 그 자리에서 물어보는 창구, 다른 하나는 연구 공고를 미리 정리해 알리는 절차입니다. 겹친다고 보기 어려워 그대로 진행해도 됩니다.",
        "lexicalOverlap": 3.3
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:38.825Z",
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
          "문의가 여러 창구로 들어와 담당 부서를 찾는 데 시간이 걸리고, 부서 간 재이관이 반복되었습니다.",
          "규정 문의 전화가 반복되고, 담당자마다 안내 내용이 조금씩 달라 재확인이 필요한 경우가 있었습니다."
        ],
        "distinct": [
          "신규: 출력이 '문의 유형, 담당 부서 제안'",
          "기존: 출력이 '답변 문장, 근거 조항, 원문 링크'",
          "신규: '문의 접수 → 유형 자동 분류 → 담당자 확인 → 이관'",
          "기존: '챗봇에 질문 → 근거 조항과 함께 답변 확인 → 필요 시 담당자 문의'"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "두 도구 모두 반복되는 학생·구성원 문의 부담을 줄이려는 것이지만, 하는 일이 다릅니다. 신규 도구는 문의 내용을 보고 유형을 나눠 어느 부서로 보낼지 제안하는 '분류와 이관' 역할이고, 기존 챗봇은 규정 질문에 근거 조항을 붙여 '답을 주는' 역할입니다. 다만 실제 창구에서는 같은 문의가 두 도구 중 어디로 가야 하는지 헷갈릴 수 있으므로, 규정 관련 질문은 챗봇으로 먼저 안내하고 그 밖의 문의는 분류 도구로 보내는 식의 사용 기준을 정해 두는 것이 좋겠습니다.",
        "lexicalOverlap": 2.4
      },
      {
        "candidateToolId": "d0829692-8f18-4615-9ff8-f18587a103da",
        "verdict": "RELATED",
        "score": 20,
        "overlapping": [
          "분류·라우팅"
        ],
        "distinct": [
          "기존 등록 내용은 '요약: ㅇㄹ', '문제: ㅇㄹㅇ', '입력: ㅇㄹㅇㄹ' 등으로 내용을 확인할 수 없음"
        ],
        "recommendation": "PROCEED",
        "explanation": "같은 '분류·라우팅' 분류에 등록되어 있다는 점만 같습니다. 그런데 기존 등록 건의 설명, 입력, 출력이 모두 뜻을 알 수 없는 글자로만 채워져 있어 실제로 무슨 일을 하는 도구인지 확인할 수 없습니다. 겹침 여부를 판단할 근거가 없으므로 신규 등록은 그대로 진행하시고, 기존 등록 건은 작성자에게 내용 보완을 요청하거나 시험용 등록이라면 정리하시는 편이 좋겠습니다.",
        "lexicalOverlap": 0
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:42.254Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "b7302057-53df-46bd-864c-396fe8513c2c",
    "toolId": "49361a84-a5db-4c7c-af4f-bbb51f29fa8c",
    "findings": [
      {
        "candidateToolId": "d0829692-8f18-4615-9ff8-f18587a103da",
        "verdict": "RELATED",
        "score": 30,
        "overlapping": [
          "새 신청: 문제 상황 \"ㅇㄹㅇ\" / 기존 도구: 문제 상황 \"ㅇㄹㅇ\"",
          "새 신청: 입력 자료 \"ㅇㄹㅇㄹ\" / 기존 도구: 입력 자료 \"ㅇㄹㅇㄹ\"",
          "두 건 모두 자동화 수준 \"AI_ASSISTED\", 사용 환경 \"DESKTOP\", 외부 전송 없음"
        ],
        "distinct": [
          "새 신청은 분류가 \"데이터 취합\", 기존 도구는 \"분류·라우팅\"",
          "새 신청은 태그 \"변환\"이 있고 기존 도구는 태그가 없음",
          "새 신청은 자료 등급이 \"PUBLIC, INTERNAL\", 기존 도구는 \"PUBLIC\"만 해당"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "두 등록 내용이 모두 이름·요약·업무 흐름·입력·출력이 뜻이 없는 글자(\"1212\", \"ㅇㄹㅇㄹ\" 등)로만 채워져 있어, 같은 일을 하는 도구인지 판단할 근거가 없습니다. 사용 환경과 자동화 방식, 외부 전송 여부가 같다는 점만 겹치고, 분류는 한쪽이 \"데이터 취합\", 다른 쪽이 \"분류·라우팅\"으로 다릅니다. 겹침 여부를 가리기 전에 신청자에게 어떤 업무를 어떤 자료로 처리해 무엇을 내보내는지 실제 내용을 다시 받아, 두 건이 서로 어떻게 다른지(또는 같은지) 확인하는 것이 먼저입니다.",
        "lexicalOverlap": 50
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:50.852Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "ad7df033-02bf-40d7-9cfe-58f80b1a8d6b",
    "toolId": "d0829692-8f18-4615-9ff8-f18587a103da",
    "findings": [
      {
        "candidateToolId": "49361a84-a5db-4c7c-af4f-bbb51f29fa8c",
        "verdict": "RELATED",
        "score": 30,
        "overlapping": [
          "problemStatement: \"ㅇㄹㅇㄹ\" / \"ㅇㄹㅇ\" (양쪽 모두 뜻을 알 수 없는 임의 문자)",
          "keyFeatures: \"ㅇㄹㅇㄹ\" (양쪽 동일한 형태의 임의 문자)",
          "inputData: \"ㅇㄹㅇㄹ\" (양쪽 동일)",
          "automationLevel: AI_ASSISTED (양쪽 동일)",
          "runtimeKind: DESKTOP (양쪽 동일)",
          "sendsDataExternally: false (양쪽 동일)"
        ],
        "distinct": [
          "categoryName: 새 신청은 \"분류·라우팅\", 기존은 \"데이터 취합\"",
          "dataClassifications: 새 신청은 PUBLIC, 기존은 PUBLIC, INTERNAL",
          "tags: 새 신청은 없음, 기존은 \"변환\""
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "두 등록 내용 모두 문제 상황, 기능, 처리 과정, 입력·출력이 모두 뜻을 알 수 없는 임의 문자(예: \"ㅇㄹㅇㄹ\")로만 적혀 있어, 실제로 같은 일을 하는 도구인지 판단할 근거가 없습니다. 다만 입력 내용, 자동화 방식(사람이 도구를 도움받아 사용), 실행 형태(데스크톱)가 적힌 그대로는 서로 같아 겹칠 소지가 있습니다. 적어 놓은 분류만 \"분류·라우팅\"과 \"데이터 취합\"으로 다릅니다. 두 건 모두 어떤 업무를 어떤 순서로 처리하는지 다시 작성하도록 요청한 뒤, 실제로 무엇이 다른지 확인해 구분해 주시기 바랍니다.",
        "lexicalOverlap": 50
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:52.492Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "73141e67-827f-455a-856f-3c9e030248ec",
    "toolId": "204f8e90-25ae-4cdf-8546-0404cf5e1ef6",
    "findings": [
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000007",
        "verdict": "RELATED",
        "score": 45,
        "overlapping": [
          "녹음 파일을 글로 옮기고 주제별로 묶기",
          "회의 녹음 업로드 → 정리 초안 자동 생성 → 작성자가 손보기",
          "정리된 회의 기록"
        ],
        "distinct": [
          "새 도구 입력: 강의 녹화 영상 파일 (mp4) / 기존 입력: 회의 녹음 파일 또는 받아쓴 글, 참석자 목록",
          "새 도구 출력: 주차별 요약문과 키워드 목록 / 기존 출력: 사람별 할 일 목록",
          "기존은 학과 회의록 양식에 맞춰 내보내기, 새 도구는 학과 게시판용 주차별 요약",
          "새 도구는 sendsDataExternally: true, 기존은 false"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "두 도구 모두 녹음·녹화된 말을 글로 옮겨 요약 초안을 만들고 사람이 손보는 흐름이 같습니다. 다만 대상이 회의와 수업 녹화본으로 다르고, 뽑아내는 결과도 한쪽은 사람별 할 일, 다른 한쪽은 주차별 핵심 내용과 키워드로 다릅니다. 둘 다 필요할 수 있으나, 회의 녹음은 기존 도구, 수업 녹화본은 새 도구를 쓴다는 식으로 사용 상황을 명확히 나눠 안내하는 것이 좋겠습니다.",
        "lexicalOverlap": 2.1
      },
      {
        "candidateToolId": "00000006-0000-4000-8000-000000000001",
        "verdict": "RELATED",
        "score": 28,
        "overlapping": [
          "안건별 논의 내용 요약",
          "요약·과업 초안 자동 생성 → 작성자 확인 및 수정"
        ],
        "distinct": [
          "기존 입력은 회의 녹취록 텍스트로, 영상이나 음성 파일을 다루지 않습니다",
          "새 도구는 영상에서 자막 추출 단계가 있습니다",
          "기존 출력은 회의록 서식과 담당자별 과업, 새 도구는 주차별 요약문과 키워드 목록"
        ],
        "recommendation": "DIFFERENTIATE",
        "explanation": "말한 내용을 요약해 초안을 만들고 사람이 고친다는 점은 비슷하지만, 기존 도구는 이미 글로 된 회의 녹취록을 받고 회의록 서식과 담당자 과업을 만듭니다. 새 도구는 영상 파일에서 자막을 뽑는 단계가 앞에 있고 결과물도 수업 주차별 요약입니다. 겹침은 크지 않으나 '요약 도구'가 여러 개 생기지 않도록 각각 어떤 자료를 넣는 도구인지 표시해 두면 좋겠습니다.",
        "lexicalOverlap": 1.4
      }
    ],
    "comparedCount": 9,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:06:59.108Z",
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
    "summary": "참석자 명단 등 개인 식별 정보를 포함한 회의 녹취록을 처리하지만, 작성자 확인 단계를 거치는 HUMAN_IN_THE_LOOP 방식이고 외부 전송이 없다고 등록되어 있습니다. 성적·상담·인사 기록이나 연구보안 정보, 비용 지출, 원본 파일 변경, 관리자 권한 사용 요소는 확인되지 않아 MEDIUM으로 판단합니다. 다만 보관기간·접근통제·실행 로그에 관한 기재가 없어 등록 내용 보완 후 재검토가 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": true,
        "reason": "참석자 명단과 담당자별 과업 등 개인 식별 가능 정보를 처리합니다.",
        "evidence": "회의 녹취록 텍스트, 참석자 명단, 회의 안건 / \"PERSONAL\""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록을 다룬다는 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "보안과제나 미공개 연구자료 처리에 관한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": false,
        "reason": "외부 전송이 없다고 등록되어 있습니다.",
        "evidence": "\"sendsDataExternally\": false"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "해외 리전 저장에 관한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간 미설정을 확인할 대목이 등록 내용에 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근통제 부재를 확인할 대목이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 부재를 확인할 대목이 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "작성자 확인 단계가 명시되어 있습니다.",
        "evidence": "요약·과업 초안 자동 생성 → 작성자 확인 및 수정 → 이메일 배포"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가에 관한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출·결재 승인 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 배포는 작성자 확인 이후 절차이며 교외 수신자 자동 발송이라는 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 파일 삭제·덮어쓰기에 관한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 권한 사용에 관한 기재가 없습니다.",
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
      "generatedAt": "2026-08-28T07:03:00.848Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000007",
    "suggestedLevel": "MEDIUM",
    "summary": "회의 참석자 목록과 사람별 담당 업무 등 개인 식별 정보를 처리하므로 개인정보 항목에 해당하며, 보관기간·접근통제·실행 로그에 관한 기재가 없어 관리적 보완이 필요합니다. 다만 작성자가 초안을 손보는 사람 확인 단계가 있고 외부 전송이 없으며 성적·인사·연구보안 정보나 비용 지출, 원본 삭제는 포함되지 않아 MEDIUM으로 판단했습니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": true,
        "reason": "참석자 목록과 사람별 담당 업무를 처리하여 개인 식별이 가능합니다.",
        "evidence": "inputData: \"회의 녹음 파일 또는 받아쓴 글, 참석자 목록\" / dataClassifications: \"PERSONAL\""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록을 다룬다는 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "연구보안 대상 정보에 대한 언급이 없습니다.",
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
        "reason": "국외 저장에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": true,
        "reason": "녹음 파일 등의 보관기간이나 파기 절차에 대한 설명이 없습니다.",
        "evidence": "등록 내용에 보관기간·파기 절차 관련 기재 없음"
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": true,
        "reason": "사용자별 권한 구분에 대한 설명이 없습니다.",
        "evidence": "등록 내용에 접근통제 관련 기재 없음"
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": true,
        "reason": "실행 이력 기록에 대한 설명이 없습니다.",
        "evidence": "등록 내용에 실행 로그 관련 기재 없음"
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "작성자가 초안을 검토하는 단계가 있습니다.",
        "evidence": "\"회의 녹음 업로드 → 정리 초안 자동 생성 → 작성자가 손보기 → 참석자에게 공유\" / automationLevel: HUMAN_IN_THE_LOOP"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가와 관련된 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "참석자 공유는 언급되나 교외 수신자 자동 이메일 발송 기재는 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 녹음 삭제·덮어쓰기에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 권한 사용에 대한 기재가 없습니다.",
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
        "code": "NO_RETENTION_PERIOD",
        "description": "보관기간 명시, 자동 파기 배치 구성",
        "mandatory": false
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "description": "역할 기반 접근통제 적용, 최소 권한 원칙",
        "mandatory": false
      },
      {
        "code": "NO_EXECUTION_LOG",
        "description": "실행 로그 적재, 최소 6개월 보관",
        "mandatory": false
      }
    ],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:02:59.639Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000002",
    "suggestedLevel": "LOW",
    "summary": "학과 제출 엑셀을 표준 서식으로 변환·취합하고 오류 목록을 제시하는 도구로, 최종 판단과 확정은 담당자가 수행하는 사람 개입형(HUMAN_IN_THE_LOOP)입니다. 외부 전송이 없고(sendsDataExternally: false) 데스크톱에서 동작하며, 성적·상담·인사 등 민감 기록이나 관리자 권한, 비용 지출, 원본 삭제에 해당하는 기재가 없습니다. 다만 데이터 분류가 INTERNAL·ACADEMIC이므로 취합 파일에 학생 개인정보나 성적이 포함되는지는 등록 내용만으로 확인되지 않아, 실제 제출 서식 항목을 추가 확인할 것을 권장합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력은 '학과별 제출 엑셀 파일'로만 기재되어 있고 이름·학번·연락처 등 식별정보 처리에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록을 다룬다는 기재가 없으며 기능은 서식 변환과 오류 검출에 한정됩니다.",
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
        "reason": "외부 전송이 없다고 명시되어 있습니다.",
        "evidence": "\"sendsDataExternally\": false"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "해외 리전 저장에 대한 언급이 없고 데스크톱 환경에서 동작합니다.",
        "evidence": "\"runtimeKind\": \"DESKTOP\""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간·파기 절차에 대한 기재 자체가 없어 부재를 단정할 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근권한 구분 여부에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 기록 여부에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "담당자가 오류 목록을 확인하고 최종 파일을 확정하는 사람 개입형입니다.",
        "evidence": "오류 목록 확인 → 담당자가 재요청 대상 판단 → 최종 파일 확정"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가·불이익 결정에 사용된다는 기재가 없습니다.",
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
        "reason": "이메일 발송 기능에 대한 기재가 없으며 재요청 판단도 담당자가 수행합니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "결과물은 통합 파일로 별도 출력되며 원본 삭제·덮어쓰기에 대한 언급이 없습니다.",
        "evidence": "\"outputData\": \"통합 엑셀 파일, 오류·누락 항목 목록\""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 계정이나 광범위한 시스템 권한 사용에 대한 기재가 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:03:07.692Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000003",
    "suggestedLevel": "MEDIUM",
    "summary": "이메일 초안 생성 도구로, 입력 데이터가 안내 목적·대상자 구분·마감일 등 조건에 한정되고 분류도 PUBLIC/INTERNAL 수준이며 발송 전 담당자 확인·직접 발송 단계가 있어 위험이 낮습니다. 다만 'sendsDataExternally: true'로 외부 전송이 이루어지므로 전송 대상 서비스와 데이터 범위 확인이 필요해 MEDIUM으로 판단했습니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력 데이터가 안내 목적, 대상자 구분, 마감일 등 조건으로만 기재되어 개인 식별정보 처리 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "연구보안 관련 자료를 다룬다는 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": true,
        "reason": "등록 내용에 외부 전송 여부가 참으로 표기되어 있습니다.",
        "evidence": "\"sendsDataExternally\": true"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "저장 리전에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간 관련 서술이 없어 미설정으로 단정할 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근권한 구분에 대한 서술이 없습니다.",
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
        "reason": "담당자가 수정·확인 후 직접 발송하는 흐름입니다.",
        "evidence": "초안 생성 → 담당자 수정·확인 → 직접 발송"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "선발·평가 등 결정에 관여한다는 내용이 없습니다.",
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
        "reason": "발송은 담당자가 직접 수행하며 자동 발송 기능이 없습니다.",
        "evidence": "담당자 수정·확인 → 직접 발송"
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "파일 삭제·변경 기능 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 권한 사용에 대한 언급이 없습니다.",
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
      "generatedAt": "2026-08-28T07:03:16.223Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000004",
    "suggestedLevel": "MEDIUM",
    "summary": "공개된 연구과제 공고문을 입력으로 처리하며 개인정보·성적·연구보안 정보는 다루지 않고, 요약 결과는 담당자 검수를 거친 뒤 게시·안내됩니다. 다만 등록 내용에 데이터의 외부 전송(sendsDataExternally: true)이 명시되어 있어 외부 서비스 전송 경로에 대한 확인이 필요하므로 MEDIUM으로 판단했습니다. 보관기간·접근통제·로그에 관한 기재는 없어 해당 항목은 판단 근거가 없습니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력·출력 데이터가 공고문과 요약표로만 기재되어 개인 식별정보 처리 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록 관련 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "처리 대상이 공개 공고문이며 미공개 연구자료·보안과제 자료 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": true,
        "reason": "등록 정보에 외부로 데이터를 전송한다고 명시되어 있습니다.",
        "evidence": "\"sendsDataExternally\": true"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "해외 리전 저장에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간 미설정이라는 근거 문구가 없습니다.",
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
        "reason": "자동화 단계에 담당자 검수가 포함되어 있습니다.",
        "evidence": "공고문 입력 → 핵심 항목 자동 추출 → 담당자 검수 → 게시판 등록 → 이메일 안내"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가와 관련된 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출·결재 관련 기능이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 안내는 담당자 검수 이후 단계로 기재되어 있고 교외 수신자 자동 발송 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 파일 삭제·변경 기능 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 권한 사용에 대한 기재가 없습니다.",
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
      "generatedAt": "2026-08-28T07:03:18.988Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000005",
    "suggestedLevel": "MEDIUM",
    "summary": "공개·내부 등급의 학칙 및 지침 원문과 사용자 질문만 처리하며, 성적·상담·인사 기록이나 연구보안 정보, 학생 관련 결정, 비용 지출, 파일 변경 요소는 등록 내용에 없습니다. 다만 'sendsDataExternally: true'로 처리 데이터가 외부로 전송되고 사용자 질문이 함께 전달되므로 전송 범위와 외부 처리 조건 확인이 필요합니다. 사람이 답변을 확인하는 AI 보조 방식이라 위험도는 MEDIUM으로 판단합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력·출력 데이터가 학칙·지침 원문과 사용자 질문, 답변·근거 조항·링크로만 기술되어 개인 식별정보 처리 근거가 없습니다.",
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
        "reason": "연구보안 대상 정보에 대한 언급이 없고 데이터 등급은 PUBLIC, INTERNAL입니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": true,
        "reason": "외부 전송 설정이 참으로 등록되어 있고 자연어 질의응답을 수행하는 AI 보조 도구입니다.",
        "evidence": "\"automationLevel\": \"AI_ASSISTED\", \"sendsDataExternally\": true"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "국외 리전 저장에 관한 기술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간·파기 절차가 없다고 명시한 대목이 없습니다(등록 내용에 관련 기재 없음).",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근권한 구분 부재를 나타내는 기술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 부재를 나타내는 기술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "사용자가 근거 조항과 함께 답변을 확인하고 필요 시 담당자에게 문의하는 흐름입니다.",
        "evidence": "챗봇에 질문 → 근거 조항과 함께 답변 확인 → 필요 시 담당자 문의"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "규정 안내 목적이며 선발·평가·불이익 결정에 관한 기술이 없습니다.",
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
        "reason": "이메일 발송 기능에 대한 기술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원문은 검색·인용·링크 제공에만 사용되고 삭제·덮어쓰기 기능이 없습니다.",
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
      "generatedAt": "2026-08-28T07:03:27.704Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "00000007-0000-4000-8000-000000000006",
    "suggestedLevel": "HIGH",
    "summary": "문의 본문을 처리하며 데이터 분류에 개인정보(PERSONAL)와 상담정보(COUNSELING)가 포함되어 있어, 민감 기록을 다루는 도구로 판단됩니다. 자동화 수준은 담당자 확인을 거치는 HUMAN_IN_THE_LOOP이고 외부 전송도 없다고 등록되어 추가 위험 요인은 확인되지 않았으나, 상담 기록 취급만으로 최소 HIGH에 해당합니다. 보관기간·접근통제·실행 로그에 대한 기재가 없어 별도 확인이 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": true,
        "reason": "데이터 분류에 개인정보가 명시되어 있고 문의 본문에 식별정보가 포함될 수 있습니다.",
        "evidence": "\"dataClassifications\": [\"PERSONAL\", \"COUNSELING\"]"
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": true,
        "reason": "상담정보(COUNSELING)가 데이터 분류에 포함되어 민감 기록을 다룹니다.",
        "evidence": "\"dataClassifications\": [\"PERSONAL\", \"COUNSELING\"]"
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "연구보안 관련 데이터에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": false,
        "reason": "외부 전송이 없다고 등록되어 있습니다.",
        "evidence": "\"sendsDataExternally\": false"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "해외 리전 저장에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간 미설정이라고 명시된 대목이 없습니다.",
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
        "reason": "분류 결과를 담당자가 확인한 뒤 이관하는 구조입니다.",
        "evidence": "문의 접수 → 유형 자동 분류 → 담당자 확인 → 이관"
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "문의 유형과 담당 부서 제안만 산출하며 선발·평가와 무관합니다.",
        "evidence": "\"outputData\": \"문의 유형, 담당 부서 제안\""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출이나 결재 기능에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 자동 발송 기능이 기재되지 않았습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 파일 삭제·변경에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 권한 사용에 대한 언급이 없습니다.",
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
      "generatedAt": "2026-08-28T07:03:31.921Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "b7302057-53df-46bd-864c-396fe8513c2c",
    "suggestedLevel": "LOW",
    "summary": "등록된 내용이 'ㅇㄹㅇㄹ', '1212' 등 의미 없는 임시 문자열로만 채워져 있어 실제 처리 데이터, 기능, 실행 방식을 판단할 근거가 전혀 없습니다. 데이터 등급은 PUBLIC/INTERNAL로 표시되고 외부 전송도 없다고 되어 있어 현재 근거상 위험 항목은 확인되지 않으므로 LOW로 두었습니다. 다만 이는 실제로 안전하다는 뜻이 아니라 설명이 부실하다는 의미이므로, 목적·입출력·실행 절차를 다시 작성한 뒤 재검토가 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력·출력 설명이 무의미한 문자열이며 개인 식별 정보 처리에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "연구보안 대상 자료에 대한 언급이 없습니다.",
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
        "reason": "국외 리전 저장에 대한 언급이 없고 데스크톱 실행으로 등록되어 있습니다.",
        "evidence": "\"runtimeKind\": \"DESKTOP\""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간이나 파기 절차에 관한 서술 자체가 없어 미설정으로 단정할 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근권한 구분에 관한 서술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 유무에 관한 서술이 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "AI 보조 수준으로 등록되어 있고 무인 자동 반영에 대한 언급이 없습니다.",
        "evidence": "\"automationLevel\": \"AI_ASSISTED\""
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가·불이익 결정과 관련된 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출이나 결재 승인에 관한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 발송 기능에 관한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 파일 삭제·덮어쓰기에 관한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 계정이나 광범위 권한 사용에 관한 언급이 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:03:34.860Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "ad7df033-02bf-40d7-9cfe-58f80b1a8d6b",
    "suggestedLevel": "LOW",
    "summary": "등록 내용이 의미 없는 문자열(\"ㅇㄹ\", \"ㅇㄹㅇ\" 등)로만 채워져 있어 실제 기능·처리 데이터·자동화 범위를 판단할 근거가 전혀 없습니다. 데이터 분류는 PUBLIC, 외부 전송은 없음으로 표시되어 있고 확인 가능한 위험 요소가 발견되지 않아 잠정적으로 LOW로 판단했습니다. 다만 이는 위험이 낮다는 검증 결과가 아니므로, 목적·입출력 데이터·처리 절차를 실제 내용으로 다시 등록한 후 재검토가 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": false,
        "reason": "입력·출력 데이터 설명이 의미 없는 문자열이며 개인 식별 정보 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록에 대한 언급이 없습니다. 데이터 분류는 PUBLIC입니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "연구보안 대상 정보에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": false,
        "reason": "외부 전송 여부가 false로 등록되어 있고 외부 LLM·API 언급이 없습니다.",
        "evidence": "\"sendsDataExternally\": false"
      },
      {
        "code": "STORES_OVERSEAS",
        "applies": false,
        "reason": "저장 위치나 해외 리전에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_RETENTION_PERIOD",
        "applies": false,
        "reason": "보관기간에 대한 서술 자체가 없어 미설정으로 단정할 근거가 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "접근통제 구조에 대한 서술이 없습니다.",
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
        "reason": "자동화 수준이 AI_ASSISTED로 사람이 개입하는 형태로 등록되어 있습니다.",
        "evidence": "\"automationLevel\": \"AI_ASSISTED\""
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "AUTO_APPROVES_SPENDING",
        "applies": false,
        "reason": "비용 지출이나 결재 승인 관련 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_EXTERNAL_EMAIL",
        "applies": false,
        "reason": "이메일 발송 기능에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "파일 삭제·덮어쓰기에 대한 언급이 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_ADMIN_PRIVILEGES",
        "applies": false,
        "reason": "관리자 권한 사용에 대한 언급이 없습니다.",
        "evidence": ""
      }
    ],
    "requiredControls": [],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:03:42.540Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "73141e67-827f-455a-856f-3c9e030248ec",
    "suggestedLevel": "MEDIUM",
    "summary": "강의 녹화 영상과 자막에 개인정보(PERSONAL)가 포함된다고 등록되어 있고, 처리 데이터가 외부로 전송된다고 표시되어 있어 최소 MEDIUM으로 판단했습니다. 다만 요약 결과는 조교가 검토·수정한 뒤 게시하므로 사람 확인 단계가 있고, 성적·상담·인사 기록이나 연구보안 정보, 학생에 대한 결정, 비용 지출, 원본 파일 삭제·변경, 관리자 권한 사용에 해당하는 내용은 등록 설명에 없습니다. 보관기간·접근통제·실행 로그에 대한 기재가 없어 등록 단계에서 확인이 필요합니다.",
    "suggestions": [
      {
        "code": "USES_PERSONAL_DATA",
        "applies": true,
        "reason": "데이터 분류에 개인정보가 포함되어 있으며, 강의 녹화 영상과 자막에 발화자 식별 가능한 정보가 담길 수 있습니다.",
        "evidence": "\"dataClassifications\": [\"INTERNAL\", \"PERSONAL\"] / 입력데이터: \"강의 녹화 영상 파일 (mp4)\""
      },
      {
        "code": "USES_SENSITIVE_RECORDS",
        "applies": false,
        "reason": "성적·상담·인사 기록을 다룬다는 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "USES_RESEARCH_SECURITY_DATA",
        "applies": false,
        "reason": "보안과제나 미공개 연구자료 관련 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "applies": true,
        "reason": "외부 전송 여부가 참으로 등록되어 있어 자막 추출·요약 과정에서 외부 서비스로 데이터가 전송됩니다.",
        "evidence": "\"sendsDataExternally\": true"
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
        "reason": "보관기간·파기 절차에 대한 기재가 아예 없어 판단 근거로 삼을 대목이 없습니다(등록 단계 확인 필요).",
        "evidence": ""
      },
      {
        "code": "NO_ACCESS_CONTROL",
        "applies": false,
        "reason": "사용자별 권한 구분에 대한 기재가 없어 근거로 삼을 대목이 없습니다.",
        "evidence": ""
      },
      {
        "code": "NO_EXECUTION_LOG",
        "applies": false,
        "reason": "실행 로그 유무에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "RUNS_WITHOUT_HUMAN_CHECK",
        "applies": false,
        "reason": "조교가 초안을 검토·수정한 뒤 게시하는 절차가 명시되어 있습니다.",
        "evidence": "\"조교는 초안을 검토하고 고쳐서 올립니다.\""
      },
      {
        "code": "AFFECTS_STUDENT_DECISIONS",
        "applies": false,
        "reason": "학생 선발·평가·불이익 결정과 연결된다는 기재가 없습니다.",
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
        "reason": "이메일 발송 기능에 대한 기재가 없습니다.",
        "evidence": ""
      },
      {
        "code": "DELETES_OR_MUTATES_FILES",
        "applies": false,
        "reason": "원본 영상 삭제·덮어쓰기에 대한 기재가 없고 산출물은 요약문과 키워드 목록입니다.",
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
        "code": "USES_PERSONAL_DATA",
        "description": "수집 항목 최소화, 처리 목적 명시, 개인정보 담당 부서 사전 검토",
        "mandatory": false
      },
      {
        "code": "SENDS_TO_EXTERNAL_LLM",
        "description": "전송 전 비식별 처리, 학습 미사용 계약 확인, 전송 대상·항목 문서화",
        "mandatory": false
      }
    ],
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:03:53.602Z",
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
          "회의 메모/녹취록을 넣으면 담당자별 후속 과업 목록을 뽑아 줌",
          "참석자 명단 활용",
          "회의록 요약 정리"
        ],
        "missingFeatures": [
          "과업별 기한을 함께 표시하는 기능",
          "담당자별 과업을 표 형태로 정리해 주는 결과물",
          "캘린더 자동 등록",
          "메신저로 담당자에게 전달"
        ],
        "explanation": "요청하신 '회의 메모에서 담당자별 과업 뽑기'는 이 도구가 이미 하고 있습니다. 다만 각 과업의 기한을 표시해 표로 보여주는 부분과 캘린더 등록, 메신저 전달은 없어서 그 부분만 더하면 될 것으로 보입니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000007",
        "score": 65,
        "coveredFeatures": [
          "회의 내용(녹음 또는 받아쓴 글)에서 사람별로 맡은 일 뽑아내기",
          "참석자 목록 활용",
          "회의 기록 정리"
        ],
        "missingFeatures": [
          "기한 표시",
          "담당자별 표 형태 결과물",
          "캘린더 등록",
          "메신저 전달"
        ],
        "explanation": "위 회의록 도구와 비슷하게 사람별 할 일을 뽑아 줍니다. 녹음 파일 중심이라 메모만 있는 경우에도 쓸 수 있게 다듬는 것이 좋고, 기한 표시와 표 정리는 아직 없습니다."
      }
    ],
    "comparedCount": 10,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:04:06.499Z",
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
          "필수 항목 누락 검출",
          "통합 실적표와 누락·오류 목록 동시 출력"
        ],
        "missingFeatures": [
          "누락 학과에 보낼 재요청 메일 초안 자동 작성(선택 기능)"
        ],
        "explanation": "요청하신 '서식 자동 변환'과 '누락 항목 검출', 그리고 통합표와 누락 목록을 함께 받는 부분까지 이 도구가 이미 그대로 해줍니다. 학과별 파일을 올리면 표준 서식으로 합쳐지고 누락·중복·숫자 형식 오류 목록이 함께 나오므로 바로 사용하실 수 있습니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000003",
        "score": 30,
        "coveredFeatures": [
          "재요청 안내 메일 초안 작성"
        ],
        "missingFeatures": [
          "엑셀 서식 변환",
          "실적자료 취합",
          "누락 항목 검출"
        ],
        "explanation": "선택 기능으로 적어주신 '재요청 메일 초안'은 이 도구로 만들 수 있습니다. 취합 도구에서 나온 누락 목록을 보고 이 도구로 메일 초안을 만들어 쓰는 방식으로 함께 사용하시면 됩니다."
      }
    ],
    "comparedCount": 10,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:04:04.253Z",
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
          "공고 핵심 조건(자격·규모·접수기한) 요약",
          "접수기한 정보 확보로 마감 관리 기반 마련"
        ],
        "missingFeatures": [
          "연구자별 관심 분야 정보 등록·관리",
          "관심 분야와 공고를 맞춰 골라내기",
          "연구자 개인별 맞춤 알림 발송(전체 메일이 아닌 개인 발송)",
          "마감 임박 재알림"
        ],
        "explanation": "이미 있는 '연구과제 공고 요약 서비스'가 공고를 분야별로 나누고 접수기한까지 뽑아주기 때문에, 요청의 앞부분(분야별 분류)은 상당 부분 해결됩니다. 다만 연구자 한 사람 한 사람의 관심 분야를 저장해 두고 그에 맞는 공고만 골라 개인에게 보내주는 기능은 없습니다. 지금은 여전히 전체 메일 안내 방식입니다. 따라서 이 도구에 연구자 관심 분야 등록 기능과 개인별 발송(그리고 마감 임박 재알림)을 덧붙이는 방향이 가장 현실적입니다. 개인 정보를 다루게 되므로 관심 분야·연락처 보관 범위도 함께 정해야 합니다."
      }
    ],
    "comparedCount": 10,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:04:05.476Z",
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
          "접수 채널 정보까지 함께 반영",
          "자주 묻는 질문 자동 추출"
        ],
        "explanation": "요청하신 문의 유형 분류와 담당 부서 제안을 그대로 해주는 도구가 이미 있습니다. 유사 문의 묶기도 됩니다. 다만 어느 창구로 들어온 문의인지(접수 채널)를 입력값으로 쓰지는 않고, 자주 묻는 질문을 자동으로 뽑아주는 기능은 없습니다. 이 두 가지는 원하시면 나중에 덧붙이면 되는 정도입니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000005",
        "score": 15,
        "coveredFeatures": [],
        "missingFeatures": [
          "문의 유형 분류",
          "담당 부서 제안"
        ],
        "explanation": "규정 관련 질문에 답을 찾아주는 도구라, 반복 문의 자체를 줄이는 데는 도움이 되지만 문의를 분류해 담당 부서로 넘기는 일은 하지 않습니다."
      }
    ],
    "comparedCount": 10,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:04:11.926Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "demandId": "848ef405-4fd1-4c30-80ea-7eec90af77cf",
    "outcome": "NOT_COVERED",
    "findings": [],
    "comparedCount": 10,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:04:08.752Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "demandId": "2a503c0f-321a-44d2-a713-18aff577542c",
    "outcome": "NOT_COVERED",
    "findings": [
      {
        "toolId": "00000006-0000-4000-8000-000000000002",
        "score": 15,
        "coveredFeatures": [
          "서로 다른 서식을 하나의 기준 서식으로 맞추는 개념",
          "담당자가 결과를 확인한 뒤 최종 파일을 확정하는 절차",
          "정리된 파일 저장·출력"
        ],
        "missingFeatures": [
          "한글 문서 읽기",
          "워드 문서 읽기",
          "PDF 읽기",
          "한글·워드·PDF 간 형식 변환",
          "문서 서식(글꼴·여백·제목 체계 등) 통일"
        ],
        "explanation": "이 도구는 엑셀 파일만 다룹니다. 서로 다른 서식을 기준에 맞춰 정리하고 담당자가 확인 후 확정하는 흐름은 요청과 닮아 있지만, 한글·워드·PDF 문서를 열어 읽고 형식을 바꾸는 일은 전혀 하지 못합니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000001",
        "score": 8,
        "coveredFeatures": [
          "정해진 내부 표준 서식을 문서에 자동 적용",
          "내보내기 전 작성자 확인 단계"
        ],
        "missingFeatures": [
          "한글·워드·PDF 파일 읽기",
          "파일 형식 변환",
          "일반 문서의 서식 통일",
          "변환 결과 파일 저장"
        ],
        "explanation": "회의록에만 쓰이는 도구로, 표준 서식을 적용한다는 점만 겹칩니다. 여러 종류의 문서 파일을 읽어 형식을 바꾸는 기능은 없습니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000004",
        "score": 5,
        "coveredFeatures": [
          "PDF 문서 내용 읽어 활용",
          "담당자 검수 단계"
        ],
        "missingFeatures": [
          "한글·워드 파일 읽기",
          "파일 형식 변환",
          "서식 기준에 맞춘 통일",
          "변환된 파일 저장"
        ],
        "explanation": "공고문 PDF에서 필요한 내용을 뽑아내는 도구입니다. PDF 내용을 읽는다는 점만 겹치고, 요청하신 형식 변환이나 서식 통일과는 목적이 다릅니다."
      }
    ],
    "comparedCount": 10,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:04:18.585Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "demandId": "ce225435-25e8-45da-9e88-d603eeb42e72",
    "outcome": "PARTIAL",
    "findings": [
      {
        "toolId": "00000006-0000-4000-8000-000000000007",
        "score": 70,
        "coveredFeatures": [
          "녹음 파일 내용을 글로 옮기기",
          "핵심 내용 정리·요약",
          "요약문 만들기",
          "회의록 양식에 맞춘 문서 초안 만들기"
        ],
        "missingFeatures": [
          "영상 파일 처리",
          "한글·워드 문서 불러와 내용 반영"
        ],
        "explanation": "회의 녹음을 올리면 글로 옮기고 주제별로 정리해 회의록 초안까지 만들어 주는 도구로, 요청하신 흐름과 가장 가깝습니다. 다만 영상 파일과 한글·워드 문서를 함께 넣는 부분은 다루지 않으니 그 부분만 더하면 됩니다."
      },
      {
        "toolId": "00000006-0000-4000-8000-000000000001",
        "score": 50,
        "coveredFeatures": [
          "핵심 내용 정리·요약",
          "요약문 만들기",
          "서식이 적용된 회의록 초안 만들기"
        ],
        "missingFeatures": [
          "녹음·영상 내용 옮기기(글로 변환)",
          "한글·워드 문서 불러오기"
        ],
        "explanation": "이미 글로 옮겨진 회의 내용을 넣으면 요약과 회의록 초안을 만들어 줍니다. 하지만 녹음이나 영상을 직접 넣을 수 없어, 가장 힘들다고 하신 '듣고 받아쓰는 단계'는 그대로 남습니다."
      },
      {
        "toolId": "204f8e90-25ae-4cdf-8546-0404cf5e1ef6",
        "score": 45,
        "coveredFeatures": [
          "영상에서 말한 내용 글로 뽑기",
          "핵심 내용 정리·요약",
          "요약문 만들기"
        ],
        "missingFeatures": [
          "회의용 문서 초안(회의록 형태) 만들기",
          "한글·워드 문서 불러오기",
          "녹음 파일(음성만) 처리"
        ],
        "explanation": "강의 영상을 넣으면 자막을 뽑아 요약해 주는 도구라 영상 처리 부분은 겹칩니다. 다만 강의 주차별 요약에 맞춰져 있어 회의록 형태의 문서 초안이나 한글·워드 문서 활용은 되지 않습니다."
      }
    ],
    "comparedCount": 10,
    "provenance": {
      "model": "claude-opus-5",
      "generatedAt": "2026-08-28T07:04:20.520Z",
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
            "title": "외부 전송 없음이라고 했으나, 웹에서 동작하는 AI 요약 도구라는 설명과 어긋날 수 있음",
            "evidence": "이름·요약: '[예시] AI 회의록 정리 도구 / 회의 녹취록을 요약하고 담당자별 할 일로 정리해 줍니다', 실행 방식: 'WEB' ↔ 보안 항목: '외부로 데이터를 보내지 않음(sendsDataExternally=false)'",
            "suggestion": "요약 기능이 어디에서 처리되는지(교내 자체 설치 모델인지, 외부 AI 서비스인지)를 신청서에 적어 주세요. 외부 서비스를 쓴다면 '외부 전송 없음' 표기를 바로잡아야 합니다."
          },
          {
            "severity": "NOTE",
            "title": "참석자 명단 등 개인정보를 다루지만 실행 기록을 어디에 남기는지 적혀 있지 않음",
            "evidence": "입력 자료: '회의 녹취록 텍스트, 참석자 명단, 회의 안건', 다루는 데이터 구분: '내부용, 개인정보' ↔ 신청서 어디에도 기록 보관 위치나 방법에 대한 항목이 없음",
            "suggestion": "녹취록과 참석자 명단이 어디에 저장되고 얼마나 보관되는지, 처리 기록을 남기는지를 추가로 기재하면 검토가 쉬워집니다."
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
            "title": "개인정보 보관기간 및 파기 절차 언급 없음",
            "evidence": "dataClassifications: [\"INTERNAL\", \"PERSONAL\"] 로 개인정보를 다루는 것으로 표시되어 있으나, 회의 녹취록·참석자 명단 등을 얼마나 보관하고 언제 파기하는지에 대한 언급이 없음",
            "suggestion": "회의 녹취록, 참석자 명단 등 개인정보가 포함된 자료의 보관 기간과 파기 절차를 명시해 주세요. 특히 회의 내용에 학생 상담이나 인사 관련 민감 정보가 포함될 가능성이 있다면 별도 기준이 필요합니다."
          },
          {
            "severity": "WARNING",
            "title": "요약 처리 방식과 외부 전송 여부에 대한 설명 불충분",
            "evidence": "sendsDataExternally: false 로 표시되어 있으나, 녹취록 요약과 과업 추출을 어떤 방식으로 수행하는지(예: AI 모델 호출 여부, 해당 모델이 어디서 구동되는지)에 대한 설명이 없음",
            "suggestion": "요약 생성에 사용하는 AI 모델이 대학 자체 시스템에서 도는지, 외부 서비스(예: 상용 AI API)를 호출하는지 명확히 밝히고, 외부 호출이 있다면 데이터가 학습에 재사용되지 않는지 확인해 주세요."
          },
          {
            "severity": "WARNING",
            "title": "실행 이력(누가 언제 실행했는지) 기록 여부 언급 없음",
            "evidence": "누가 언제 이 도구를 실행했는지에 대한 기록 방법이 신청서에 언급되어 있지 않음",
            "suggestion": "회의록에 참석자 개인정보가 포함되는 만큼, 실행자와 실행 시각을 기록하는 절차를 마련하고 이를 신청서에 명시해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "처리 결과물 및 원본 녹취록의 저장 위치 언급 없음",
            "evidence": "요약 회의록과 원본 녹취록이 어디에 저장되는지(국내 서버인지 여부 포함)에 대한 언급이 없음",
            "suggestion": "생성된 회의록과 입력된 녹취록의 저장 위치를 명시하고, 국외 서버를 사용한다면 이에 대한 안내를 추가해 주세요."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:04:40.239Z",
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
            "title": "음성을 글로 옮기는 방식이 적혀 있지 않습니다",
            "evidence": "주요 기능에 \"녹음 파일을 글로 옮기고 주제별로 묶기\"라고 적혀 있고, 보안 항목은 \"외부 전송 없음(sendsDataExternally: false)\"으로 표시되어 있습니다. 다만 녹음을 글로 옮기는 처리를 어디에서 하는지는 신청서에 나와 있지 않습니다.",
            "suggestion": "녹음 파일을 글로 옮기는 처리를 학내에서 하는지, 외부 서비스를 쓰는지 한 줄 덧붙여 주시면 외부 전송 없음 표시와 맞는지 바로 확인됩니다. 어긋남은 아니고 빠진 항목입니다."
          },
          {
            "severity": "NOTE",
            "title": "실행 기록을 남기는지에 대한 언급이 없습니다",
            "evidence": "신청서에는 입력 자료(\"회의 녹음 파일 또는 받아쓴 글, 참석자 목록\")와 결과물(\"정리된 회의 기록, 사람별 할 일 목록\")만 적혀 있고, 누가 언제 어떤 녹음을 올렸는지 기록을 남기는지에 대한 내용은 없습니다.",
            "suggestion": "개인정보가 포함된 참석자 목록과 녹음을 다루므로, 업로드·생성 기록을 남기는지 여부를 적어 주시면 좋습니다."
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
            "title": "회의 녹음과 참석자 개인정보의 보관기간·파기 절차가 없음",
            "evidence": "inputData: \"회의 녹음 파일 또는 받아쓴 글, 참석자 목록\", dataClassifications: [\"INTERNAL\", \"PERSONAL\"] — 이 개인정보를 얼마나 보관하고 언제 파기하는지에 대한 언급이 없음",
            "suggestion": "회의 녹음 파일과 정리된 기록, 참석자 정보의 보관 기간과 파기 절차를 명시해야 합니다. 특히 녹음 원본은 정리가 끝나면 삭제하는 규정을 두는 것이 바람직합니다."
          },
          {
            "severity": "WARNING",
            "title": "음성을 글로 옮기는 처리가 외부 서비스로 가는지 여부가 불명확함",
            "evidence": "sendsDataExternally: false 로 되어 있으나, keyFeatures에 \"녹음 파일을 글로 옮기고 주제별로 묶기\"라는 기능이 있는데 이 음성 인식(받아쓰기) 처리를 어떤 방식으로 수행하는지, 외부 음성인식 엔진을 쓰는지에 대한 설명이 없음",
            "suggestion": "음성-텍스트 변환이 자체 처리인지 외부 API를 쓰는지 명확히 밝히고, 외부로 나간다면 어디로 가는지, 학습에 사용되지 않는지를 기재해야 합니다."
          },
          {
            "severity": "NOTE",
            "title": "실행 이력(누가 언제 업로드·정리했는지) 기록에 대한 언급이 없음",
            "evidence": "automatedWorkflow: \"회의 녹음 업로드 → 정리 초안 자동 생성 → 작성자가 손보기 → 참석자에게 공유\" — 각 단계의 실행자와 시각을 기록하는지에 대한 언급이 없음",
            "suggestion": "녹음 업로드자, 초안 검토자, 공유 시점 등을 기록해 두면 추후 확인이나 분쟁 시 근거가 됩니다."
          },
          {
            "severity": "NOTE",
            "title": "정리된 회의 기록과 녹음 파일의 저장 위치에 대한 언급이 없음",
            "evidence": "outputData: \"정리된 회의 기록, 사람별 할 일 목록\" — 이 자료가 어디에 저장되는지(국내/국외, 어떤 시스템)에 대한 언급이 없음",
            "suggestion": "저장 위치와 접근 권한 범위를 명시해 주시기 바랍니다."
          }
        ]
      }
    ],
    "disagreement": true,
    "verdict": "NEEDS_HUMAN_REVIEW",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:04:37.507Z",
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
            "title": "실행 기록을 남기는지에 대한 언급이 없습니다",
            "evidence": "신청서 전체에서 실행 기록·보관 위치에 관한 내용이 없습니다. 출력물은 '통합 엑셀 파일, 오류·누락 항목 목록'으로만 적혀 있습니다.",
            "suggestion": "취합 작업이 언제, 어떤 파일로 수행됐는지 기록을 남기는지 여부와 남기는 위치를 한 줄 보완하면 좋겠습니다."
          },
          {
            "severity": "NOTE",
            "title": "입력 자료의 내용 범위가 구체적이지 않습니다",
            "evidence": "입력 자료는 '학과별 제출 엑셀 파일'로만 적혀 있고, 다루는 자료 구분은 '내부용, 학사'로 되어 있습니다. 파일에 학생·교직원 명단이나 연락처가 포함되는지는 적혀 있지 않습니다.",
            "suggestion": "제출 엑셀에 개인 식별 정보(이름·학번·연락처 등)가 포함되는지 명시해 자료 구분과 맞는지 확인해 주세요."
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
            "title": "학사 정보의 보관기간 및 파기 절차 언급 없음",
            "evidence": "dataClassifications: ['INTERNAL','ACADEMIC'] 이지만 보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "취합된 학과 제출 자료(학생 개인정보 포함 가능)에 대해 보관 기간과 사용 후 파기 절차를 명시해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 이력(누가 언제 실행했는지) 기록 여부 언급 없음",
            "evidence": "자동화 워크플로우 설명에 실행 기록이나 로그에 대한 언급이 없음",
            "suggestion": "학사 데이터를 다루는 자동화이므로 누가 언제 이 도구를 실행했는지 기록을 남기는 절차를 추가해야 합니다."
          }
        ]
      }
    ],
    "disagreement": true,
    "verdict": "NEEDS_HUMAN_REVIEW",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:04:33.229Z",
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
            "title": "외부로 자료를 보낸다고 표시했지만 어디로 무엇을 보내는지 적혀 있지 않습니다",
            "evidence": "신청서에 '외부 전송: 있음(sendsDataExternally: true)'으로 표시되어 있으나, 주요 기능은 '상황별 이메일 초안 생성', '교내 표준 문구 반영', '대상자 구분에 따른 문구 조정'만 적혀 있어 외부 서비스 이용에 대한 언급이 없습니다.",
            "suggestion": "어떤 외부 서비스에 어떤 항목(예: 입력 조건, 생성된 본문)이 전달되는지 기능 설명이나 별도 항목에 적어 주세요. 어긋남이라기보다 빠진 설명입니다."
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
            "title": "외부로 데이터를 보내는데 어디로, 어떤 목적으로 전송되는지 설명이 없음",
            "evidence": "sendsDataExternally: true 라고만 되어 있고, 전송 대상 기관이나 서비스, AI 학습에 재사용되는지 여부에 대한 언급이 없음",
            "suggestion": "데이터가 어느 서비스·서버로 전송되는지, 해당 서비스가 입력 내용을 모델 학습에 사용하지 않는지 확인하는 내용을 명시해 주세요."
          },
          {
            "severity": "WARNING",
            "title": "저장 위치가 국내인지 국외인지 언급이 없음",
            "evidence": "외부 전송(sendsDataExternally: true)은 있으나 처리·저장 서버의 위치에 대한 언급이 없음",
            "suggestion": "이메일 초안 생성에 사용되는 서비스의 서버 소재지(국내/국외)를 명시하고, 국외인 경우 관련 규정 검토 결과를 첨부해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "실행 이력(누가 언제 사용했는지) 기록 여부 언급 없음",
            "evidence": "누가 언제 실행했는지에 대한 언급이 없음",
            "suggestion": "안내 메일 초안 생성 및 발송 이력을 담당자별로 기록해 두면 추후 확인이 용이합니다."
          }
        ]
      }
    ],
    "disagreement": true,
    "verdict": "NEEDS_HUMAN_REVIEW",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:04:42.830Z",
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
        "findings": []
      },
      {
        "kind": "POLICY",
        "model": "claude-sonnet-5",
        "passed": false,
        "findings": [
          {
            "severity": "BLOCKER",
            "title": "외부로 데이터를 보내는데 어디로 보내는지, AI 학습에 쓰이는지에 대한 설명이 없음",
            "evidence": "sendsDataExternally: true 로 표시되어 있으나, 어느 외부 서비스로 보내는지, 그 서비스가 전송된 자료를 모델 학습에 재사용하는지에 대한 언급이 없음",
            "suggestion": "외부 전송 대상(예: 어떤 AI 서비스, 어느 국가 서버)과 해당 서비스의 데이터 학습 이용 여부 및 처리 방침을 명시해 주세요."
          },
          {
            "severity": "WARNING",
            "title": "공고문 자료의 보관기간과 파기 절차에 대한 언급이 없음",
            "evidence": "inputData: 연구과제 공고문, 원문 링크 / outputData: 핵심 조건 요약표, 분야 분류 결과 — 이 자료들의 보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "공고문 원문과 요약 결과물을 얼마나 보관하고 언제 어떻게 파기하는지 명시해 주세요. 공고문이 공개 정보라도 처리 이력 관리 차원에서 필요합니다."
          },
          {
            "severity": "WARNING",
            "title": "저장 위치(국내/국외)에 대한 언급이 없음",
            "evidence": "입력·출력 데이터의 저장 위치에 대한 언급이 없음",
            "suggestion": "공고문 원문, 요약 결과가 국내 서버에 저장되는지 국외 서버(외부 AI 서비스 포함)에 저장되는지 명시해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "실행 이력(누가 언제 실행했는지) 기록 여부에 대한 언급이 없음",
            "evidence": "자동화 워크플로우에 실행 기록이나 로그에 대한 설명이 없음",
            "suggestion": "담당자 검수 및 게시 시점의 실행 이력이 남는지 여부를 기재하면 추후 확인에 도움이 됩니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:04:47.319Z",
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
            "title": "외부로 자료를 보낸다고 표시했지만 어디로 보내는지 적혀 있지 않습니다",
            "evidence": "보안 항목: '외부 전송 있음(sendsDataExternally: true)' / 주요 기능: '자연어 질문 검색, 근거 조항 인용, 원문 링크 제공, 불확실 시 문의 안내' — 외부 서비스나 전송 대상에 대한 언급이 없음",
            "suggestion": "질문 내용이나 규정 원문이 어떤 외부 서비스로 전달되는지, 전달되는 항목은 무엇인지 기능 설명이나 입출력 자료 항목에 한 줄 덧붙여 주세요."
          },
          {
            "severity": "NOTE",
            "title": "실행 기록을 어디에 남기는지에 대한 언급이 없습니다",
            "evidence": "자동화 후 흐름: '챗봇에 질문 → 근거 조항과 함께 답변 확인 → 필요 시 담당자 문의' / 출력 자료: '답변 문장, 근거 조항, 원문 링크' — 질문·답변 기록의 보관 여부에 대한 설명이 없음",
            "suggestion": "질문과 답변 내역을 남기는지, 남긴다면 어디에 얼마 동안 두는지 적어 주시면 검토가 수월합니다."
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
            "title": "외부 전송 대상과 목적이 명시되지 않음",
            "evidence": "\"sendsDataExternally\": true 로 표시되어 있으나, 어디로 전송되는지, AI 학습에 사용되는지에 대한 언급이 없음",
            "suggestion": "데이터가 전송되는 외부 업체명, 전송 목적, 해당 업체가 데이터를 자체 학습에 활용하지 않는다는 확인 문구를 추가해 주세요."
          },
          {
            "severity": "WARNING",
            "title": "사용자 질문 데이터의 보관기간·파기 절차 없음",
            "evidence": "inputData에 \"사용자 질문\"이 포함되어 있으나 이에 대한 보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "사용자가 입력한 질문 로그를 얼마나 보관하고 언제 파기하는지 명시해 주세요. 질문 내용에 개인 식별 정보가 섞일 가능성도 검토가 필요합니다."
          },
          {
            "severity": "NOTE",
            "title": "실행 이력(누가 언제 사용했는지) 기록 여부 언급 없음",
            "evidence": "실행 로그나 사용 이력 기록에 대한 언급이 없음",
            "suggestion": "문의 응대 품질 관리 및 오남용 확인을 위해 사용자별 질의 이력을 일정 기간 기록하는지 명시하면 좋습니다."
          }
        ]
      }
    ],
    "disagreement": true,
    "verdict": "NEEDS_HUMAN_REVIEW",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:04:54.017Z",
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
            "title": "다루는 자료로 개인정보·상담정보를 적었는데, 입력·출력 항목에는 그런 자료가 보이지 않습니다",
            "evidence": "다루는 자료: \"PERSONAL(개인정보), COUNSELING(상담정보)\" / 입력 자료: \"문의 본문\", 출력 자료: \"문의 유형, 담당 부서 제안\"",
            "suggestion": "문의 본문에 학생 이름·연락처·상담 내용이 함께 들어오는지 밝혀 입력 자료 설명을 보완하거나, 실제로 개인정보를 다루지 않는다면 다루는 자료 분류를 조정해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "주요 기능 중 '유사 문의 묶기'가 자동화 후 절차에 나타나지 않습니다",
            "evidence": "주요 기능: \"유사 문의 묶기\" / 자동화 후 절차: \"문의 접수 → 유형 자동 분류 → 담당자 확인 → 이관\"",
            "suggestion": "유사 문의를 모아 주는 기능이 어느 단계에서 동작하는지 절차 설명에 한 줄 넣어 주세요. (표기 오류로 보이는 '묶기'도 함께 확인 부탁드립니다.)"
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
            "title": "개인정보 및 상담 기록의 보관기간·파기 절차가 없음",
            "evidence": "dataClassifications: [\"PERSONAL\", \"COUNSELING\"] 항목만 있고 보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "학생 개인정보와 상담 관련 내용을 얼마나 보관하고 언제 어떻게 파기하는지 절차를 명시해야 합니다. 특히 상담 기록은 일반 문의보다 민감하므로 더 엄격한 기준이 필요합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 이력(누가 언제 처리했는지)에 대한 기록 여부가 없음",
            "evidence": "자동화된 업무 흐름과 데이터 항목은 설명되어 있으나, 분류 및 이관 처리에 대한 실행 기록(로그) 보관 여부에 대한 언급이 없음",
            "suggestion": "문의가 언제, 어떤 기준으로 분류되었고 담당자가 언제 확인했는지 기록이 남도록 하고, 이 기록의 보관 방침도 함께 명시해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "입력 데이터 범위와 상담 기록 포함 여부가 불분명함",
            "evidence": "inputData는 \"문의 본문\"으로만 되어 있으나 dataClassifications에는 COUNSELING이 포함되어 있음",
            "suggestion": "일반 문의와 상담 기록이 섞여 들어오는 것인지, 상담 기록이 포함된다면 접근 가능한 담당자 범위를 별도로 제한할 필요가 있는지 명확히 해주세요."
          },
          {
            "severity": "NOTE",
            "title": "데이터 저장 위치에 대한 언급이 없음",
            "evidence": "저장 위치(국내/국외)에 대한 언급이 없음",
            "suggestion": "문의 데이터와 분류 결과가 어디에(국내 서버인지 등) 저장되는지 밝혀 주시면 검토에 도움이 됩니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:04:58.039Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "b7302057-53df-46bd-864c-396fe8513c2c",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": true,
        "findings": [
          {
            "severity": "NOTE",
            "title": "신청서 본문이 의미 없는 글자로만 채워져 있어 내용 확인이 불가능합니다",
            "evidence": "해결하려는 문제: \"ㅇㄹㅇㄹ\" / 주요 기능: \"ㅇㄹㅇㄹ\" / 현재 업무 흐름: \"ㅇㄹㅇ\" / 자동화 후 흐름: \"ㅇㄹㅇ\" / 입력 자료: \"ㅇㄹㅇㄹ\" / 산출물: \"ㄹㅇㄹㅇㄹ\" / 이름·요약: \"1212\"",
            "suggestion": "실제 업무 내용으로 다시 작성해 주세요. 특히 해결하려는 문제, 주요 기능, 입력 자료와 산출물은 구체적으로 적어야 검토가 가능합니다."
          },
          {
            "severity": "NOTE",
            "title": "기능 설명이 비어 있어 '외부 전송 없음'과 '취급 자료 등급'을 대조할 수 없습니다",
            "evidence": "외부 전송 여부: 없음(false), 취급 자료: 공개·내부 자료 / 다만 주요 기능은 \"ㅇㄹㅇㄹ\", 입력 자료는 \"ㅇㄹㅇㄹ\"로만 적혀 있어 어떤 자료를 어디로 보내는지 알 수 없습니다.",
            "suggestion": "어떤 자료를 받아 어떤 경로로 처리하는지 서술한 뒤, 외부 서비스 사용 여부를 다시 표시해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "자동화 수준(AI 보조)에 해당하는 사람의 확인 단계가 흐름 설명에 나타나지 않습니다",
            "evidence": "자동화 수준: AI 보조 / 자동화 후 업무 흐름: \"ㅇㄹㅇ\"",
            "suggestion": "자동화 후 흐름에서 사람이 어느 단계에서 결과를 확인하고 승인하는지 적어 주세요."
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
            "title": "신청서 내용이 실질적으로 작성되지 않음",
            "evidence": "problemStatement: 'ㅇㄹㅇㄹ', currentWorkflow: 'ㅇㄹㅇ', automatedWorkflow: 'ㅇㄹㅇ', inputData: 'ㅇㄹㅇㄹ', outputData: 'ㄹㅇㄹㅇㄹ'",
            "suggestion": "문제 정의, 현재/자동화 워크플로우, 입력·출력 데이터 항목을 실제 내용으로 구체적으로 작성해야 검토가 가능합니다. 무의미한 문자열로는 규정 위반 여부를 판단할 수 없으므로 재작성 후 재제출을 요청하세요."
          },
          {
            "severity": "WARNING",
            "title": "데이터 분류와 실제 입출력 데이터 설명 불일치 가능성",
            "evidence": "dataClassifications: ['PUBLIC','INTERNAL']이지만 inputData, outputData 항목이 'ㅇㄹㅇㄹ', 'ㄹㅇㄹㅇㄹ'로 의미를 알 수 없음",
            "suggestion": "실제로 어떤 데이터를 다루는지 구체적으로 기재하고, 개인정보(학생 성적, 상담기록, 인사정보 등)가 포함되는지 명확히 확인해야 합니다. 포함된다면 데이터 분류를 CONFIDENTIAL 등으로 수정하고 보관기간·파기 절차를 명시해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "보관기간 및 파기 절차에 대한 언급 없음",
            "evidence": "보관기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "이 도구가 다루는 데이터의 보관 기간과 파기 절차를 명시해야 합니다. 특히 개인정보가 포함될 가능성이 있으므로 반드시 확인이 필요합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 기록(누가 언제 실행했는지)에 대한 언급 없음",
            "evidence": "실행 이력이나 로그 기록에 대한 언급이 없음",
            "suggestion": "누가 언제 이 도구를 실행했는지 기록이 남는지 여부를 명시해야 합니다. 데스크톱 환경에서 실행되는 도구인 만큼 실행 이력 관리 방안이 필요합니다."
          },
          {
            "severity": "NOTE",
            "title": "AI 보조 자동화 수준에 대한 사람 확인 절차 언급 없음",
            "evidence": "automationLevel: 'AI_ASSISTED'이지만 사람의 확인·개입 절차에 대한 언급이 없음",
            "suggestion": "AI가 보조하는 판단이 학생이나 교직원에게 영향을 줄 수 있는지 확인하고, 그렇다면 최종 확인은 사람이 하도록 절차를 명시하는 것이 좋습니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:05:01.082Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "ad7df033-02bf-40d7-9cfe-58f80b1a8d6b",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": false,
        "findings": [
          {
            "severity": "BLOCKER",
            "title": "신청서 본문이 뜻을 알 수 없는 글자로만 채워져 있어 내용 검토가 불가능함",
            "evidence": "이름 'ㅁㅇㄹ', 요약 'ㅇㄹ', 해결하려는 문제 'ㅇㄹㅇ', 주요 기능 'ㅇㄹㅇㄹ', 현재 방식 'ㅇㄹㅇ', 자동화 후 방식 'ㅇㄹㅇㄹ', 입력 자료 'ㅇㄹㅇㄹ', 산출물 'ㅇㄹㅇ' — 모든 서술 항목이 의미 없는 자모 나열입니다. 반면 선택 항목에는 '자동화 수준: AI 보조', '실행 환경: 데스크톱', '분류: 분류·라우팅', '다루는 데이터: 공개', '외부 전송: 없음'과 같이 구체적인 값이 들어가 있습니다.",
            "suggestion": "서술 항목이 실제 내용으로 채워지지 않은 상태이므로 반환하여 재작성을 요청하세요. 특히 해결하려는 문제, 주요 기능, 입력 자료, 산출물은 선택 항목(공개 데이터·외부 전송 없음)과 맞는지 확인할 수 있을 만큼 구체적으로 적도록 안내가 필요합니다."
          },
          {
            "severity": "NOTE",
            "title": "선택 항목만으로는 근거를 확인할 수 없음",
            "evidence": "'다루는 데이터: 공개', '외부 전송: 없음'이라고 선택되어 있으나, 입력 자료란에는 'ㅇㄹㅇㄹ'만 적혀 있어 어떤 자료를 다루는지 확인할 수 없습니다.",
            "suggestion": "입력 자료와 산출물이 채워진 뒤에 개인정보 포함 여부와 외부 전송 여부를 다시 대조해 보세요."
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
            "title": "신청서 내용이 실질적으로 작성되지 않음",
            "evidence": "name: 'ㅁㅇㄹ', summary: 'ㅇㄹ', problemStatement: 'ㅇㄹㅇ', keyFeatures: ['ㅇㄹㅇㄹ'], currentWorkflow/automatedWorkflow/inputData/outputData 모두 의미 없는 문자('ㅇㄹㅇ' 등)로 채워짐",
            "suggestion": "도구의 목적, 처리 절차, 입력·출력 데이터의 실제 내용을 구체적으로 작성해야 심사가 가능합니다. 현재 상태로는 어떤 데이터를 다루는지조차 확인할 수 없습니다."
          },
          {
            "severity": "BLOCKER",
            "title": "데이터 분류가 실제 처리 내용과 맞는지 확인 불가",
            "evidence": "dataClassifications: ['PUBLIC'], inputData/outputData가 'ㅇㄹㅇㄹ', 'ㅇㄹㅇ'로 기재되어 실제 처리 데이터를 알 수 없음",
            "suggestion": "입력·출력 데이터를 구체적으로 기술하고, 학생 성적·상담 기록, 교직원 인사정보 등 민감한 개인정보가 포함되는지 다시 검토하여 분류를 정확히 표시해야 합니다."
          },
          {
            "severity": "BLOCKER",
            "title": "개인정보 보관기간 및 파기 절차 언급 없음",
            "evidence": "보관기간, 파기 절차에 대한 언급이 없음",
            "suggestion": "실제 처리 데이터가 확인된 이후, 개인정보가 포함된다면 보관 기간과 파기 절차를 명시해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 기록(로그) 관련 언급 없음",
            "evidence": "누가 언제 실행했는지에 대한 언급이 없음",
            "suggestion": "도구 실행 이력(실행자, 실행 시각)이 기록되는지 여부를 명시해 주세요."
          },
          {
            "severity": "NOTE",
            "title": "자동화 수준이 'AI_ASSISTED'인데 사람 확인 단계 여부 불명확",
            "evidence": "automationLevel: 'AI_ASSISTED'이나 사람 확인 절차에 대한 언급이 없음",
            "suggestion": "분류·라우팅 결과가 학생이나 교직원에게 영향을 줄 수 있다면, 최종 판단 전에 사람이 확인하는 절차를 명시해야 합니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:05:10.301Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  },
  {
    "toolVersionId": "73141e67-827f-455a-856f-3c9e030248ec",
    "results": [
      {
        "kind": "CONSISTENCY",
        "model": "claude-opus-5",
        "passed": true,
        "findings": [
          {
            "severity": "NOTE",
            "title": "개인정보를 다룬다고 표시했지만 어떤 개인정보인지 적혀 있지 않음",
            "evidence": "다루는 데이터 구분에 'PERSONAL(개인정보)'이 표시되어 있으나, 입력 자료는 '강의 녹화 영상 파일 (mp4)', 산출물은 '주차별 요약문과 키워드 목록'으로만 적혀 있습니다.",
            "suggestion": "영상 속 교수·학생의 음성이나 얼굴, 이름 언급 등 어떤 개인정보가 포함되는지 입력 자료 설명에 함께 적어 주세요."
          },
          {
            "severity": "NOTE",
            "title": "외부 전송이 있다고 했으나 어디로 보내는지 설명이 없음",
            "evidence": "'외부로 데이터를 보냄: 예'로 표시되어 있으나, 주요 기능은 '영상에서 자막 추출', '주차별 핵심 내용 요약', '키워드 목록 생성'뿐이고 자동화 흐름 설명에도 외부 서비스 이용에 대한 언급이 없습니다.",
            "suggestion": "자막 추출이나 요약에 어떤 외부 서비스를 쓰는지, 어떤 자료가 밖으로 나가는지 기능 설명에 밝혀 주세요."
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
            "title": "외부 전송인데 전송처와 학습 활용 여부가 없음",
            "evidence": "\"sendsDataExternally\": true 이지만 어디로 보내는지, AI 모델 학습에 재사용되는지에 대한 설명이 신청서 어디에도 없음",
            "suggestion": "외부로 전송되는 자막 추출/요약 처리 업체(또는 API) 이름과 해당 데이터가 학습에 사용되지 않는다는 계약 조건 또는 설정을 명시해야 합니다."
          },
          {
            "severity": "BLOCKER",
            "title": "개인정보 포함 영상·자막의 보관기간과 파기 절차 없음",
            "evidence": "dataClassifications에 PERSONAL이 포함되어 있고 입력 데이터가 강의 녹화 영상인데, 보관 기간이나 파기 절차에 대한 언급이 없음",
            "suggestion": "강의 녹화 영상, 추출된 자막, 요약 초안을 얼마나 보관하고 언제 어떻게 삭제하는지 절차를 명시해야 합니다. 특히 학생 발언이 자막에 그대로 남는 경우 개인정보 성격이 강하므로 보관 기준이 필요합니다."
          },
          {
            "severity": "WARNING",
            "title": "저장 위치(국내/국외) 언급 없음",
            "evidence": "영상 파일과 자막, 요약본이 어디에 저장되는지에 대한 언급이 없음",
            "suggestion": "녹화 영상과 처리 결과물이 국내 서버에 저장되는지, 국외 서버(외부 API 포함)를 거치는지 명시하고, 국외인 경우 관련 고지 및 동의 절차를 마련해야 합니다."
          },
          {
            "severity": "WARNING",
            "title": "실행 이력(누가 언제 처리했는지) 기록 여부 언급 없음",
            "evidence": "자동화 워크플로우 설명에 조교가 초안을 검토하고 올린다고만 되어 있고, 누가 언제 실행했는지 기록이 남는지에 대한 언급이 없음",
            "suggestion": "어떤 조교가 어떤 영상에 대해 언제 요약을 생성하고 검토했는지 이력이 남도록 하여, 추후 자막 오류나 개인정보 노출 문제가 생겼을 때 추적할 수 있게 해야 합니다."
          },
          {
            "severity": "NOTE",
            "title": "강의 중 학생 발언이 자막에 포함될 가능성에 대한 검토 없음",
            "evidence": "입력 데이터가 \"강의 녹화 영상 파일 (mp4)\"로만 되어 있고, 질의응답 등에서 학생 이름이나 발언이 요약문에 노출될 가능성에 대한 언급이 없음",
            "suggestion": "수업 중 학생 질문이나 발언이 요약본에 포함될 경우 학생 개인정보 노출 우려가 있으므로, 이를 걸러내거나 익명 처리하는 절차를 검토해 두면 좋겠습니다."
          }
        ]
      }
    ],
    "disagreement": false,
    "verdict": "FAIL",
    "provenance": {
      "model": "claude-opus-5 + claude-sonnet-5",
      "generatedAt": "2026-08-28T07:05:14.294Z",
      "humanReviewed": false,
      "reviewedBy": null,
      "reviewedAt": null
    }
  }
] as unknown as QualityReview[];

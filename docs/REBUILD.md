# 다른 컴퓨터에서 처음부터 다시 만들기

> 이 문서 하나만 있으면 저장소 없이도 같은 것을 다시 세울 수 있습니다.
> **1부**는 무엇을 만드는지, **2부**는 AI 코딩 에이전트에게 그대로 붙여 넣을 프롬프트입니다.
>
> 작성 기준: 2026-08-25 리뷰 반영 완료 시점 (커밋 `735e06f`)

---

## 0. 이 문서를 쓰는 법

1. 새 컴퓨터에서 **1부를 먼저 읽습니다.** 무엇을 만드는지 이해하지 않고
   프롬프트만 붙여 넣으면 방향이 어긋납니다.
2. **2부의 프롬프트를 순서대로** 하나씩 붙여 넣습니다. 한 번에 다 주지 마세요 —
   단계마다 `pnpm lint && pnpm typecheck && pnpm test` 를 돌려 확인하고 넘어갑니다.
3. 각 단계가 끝날 때마다 커밋합니다. 되돌릴 지점이 있어야 합니다.

> ⚠️ **이 순서는 시행착오를 이미 걷어낸 것입니다.**
> 원래는 4역할(수요자/개발자/검토자/관리자) 모델로 만든 뒤 리뷰를 받아
> 권한 모델을 갈아엎었습니다. 아래 순서는 **처음부터 최종 모델로 갑니다.**
> 부서·공개 범위·비용 단계·7항목 평가는 만들지 마세요. 다시 지우게 됩니다.

---

# 1부 — 무엇을 만드는가

## 1.1 한 줄 정의

**대학 구성원이 만든 업무 자동화 도구를 모아 서로 찾아 쓰고, 없으면 요청해서
함께 만드는 웹 플랫폼.**

이름: 캠퍼스 자동화 관제 플랫폼 (Campus Automation Control Tower)

## 1.2 풀려는 문제

- 같은 자동화 도구를 부서마다 따로 만든다. 누가 이미 만들었는지 찾을 곳이 없다.
- 업무가 번거로운 사람과 만들 줄 아는 사람이 서로를 못 만난다.
- 개인정보를 다루는 도구가 검토 없이 돌아간다.

## 1.3 핵심 원칙 — 이걸 어기면 다른 물건이 됩니다

### ① 가짜 AI 결과를 만들지 않는다

유사도 점수, 위험도 자동 판정, 추천 순위 — **숫자를 지어내지 않습니다.**
AI 어댑터는 인터페이스만 두고 `{ enabled: false, phase }` 만 반환합니다.
"추천 도구"는 AI 가 고른 게 아니라 **등록자가 표시해 둔 추천 대상**을 그대로 보여주는 것입니다.

### ② 이용자끼리 구분하지 않는다

한 사람이 수요도 올리고 도구도 만듭니다. 수요자/개발자를 나누지 않습니다.
남는 구분은 둘뿐입니다.

- **소유권** — 내가 만든 것인가
- **관리 권한** — 관리자로서 그 권한을 받았는가

### ③ 관리 권한은 운영 권한이지 저작 권한이 아니다

관리자도 남의 도구 설명이나 **남이 쓴 평가는 못 고칩니다.**

### ④ 값이 아니라 사실만 기록한다

감사 로그에 바뀐 **필드 이름**만 남깁니다. 점수·의견·개인정보를 넣지 않습니다.
(예외: 권한 변경 사유 — 권한을 바꾼 근거라 남깁니다.)

### ⑤ 평가는 익명이다

개발자와 수요자가 서로 아는 학내 플랫폼에서 실명 평가는 솔직한 이야기를 막습니다.
작성자는 저장하되(중복 방지·본인 수정) 화면에 표시하지 않습니다.

### ⑥ 0 과 "모름"을 구분한다

평가가 없으면 0점이 아니라 "평가 없음". 비용을 모르면 0원이 아니라 "파악하지 못함".

### ⑦ 권한 없음은 404 로 보여준다

"권한이 없습니다"라고 알리면 그 항목이 **존재한다는 사실**이 새어 나갑니다.

---

## 1.4 권한 모델 — 축 셋

역할 하나가 아니라 세 축으로 나눕니다. `src/domain/authz/accounts.ts`

```ts
AccountType      'USER' | 'ADMIN'

AdminPermission  'REVIEW'             도구 검토 · 위험 체크리스트 · 수요-도구 연결
                 'MANAGE_USERS'       계정 권한 변경 · 활성/비활성
                 'MANAGE_CATEGORIES'  카테고리 관리
                 'MANAGE_TOOLS'       정식 승인 · 사용 중지 · 폐기
                 'MANAGE_NOTICES'     공지 작성
                 'VIEW_AUDIT'         감사 로그 열람

MemberType       'STUDENT' | 'STAFF' | 'PROFESSOR' | 'EXTERNAL'
                 ↑ 권한이 아니다. "누구에게 맞는 도구인지" 가리는 데만 쓴다.
```

**지켜야 할 규칙**

- 이용자(`USER`)는 관리 권한을 가질 수 없다. 이용자로 내리면 권한을 함께 비운다.
- **권한을 하나도 못 받은 관리자 계정은 이용자와 같다.** 계정 종류만으로 문이 열리면
  세분화한 의미가 없다.
- 자기 권한은 스스로 못 바꾼다.
- **검토와 정식 승인을 나눈다.** `REVIEW` 는 시범운영 승인까지, 정식 승인·중지·폐기는
  `MANAGE_TOOLS`. 검토한 사람이 혼자 끝내지 못하게 하는 이중 확인이다.
- 검토자는 자기 자신에게만 배정한다. 남에게 배정하려면 `MANAGE_USERS` 도 있어야 한다.

---

## 1.5 도메인 모델

### 도구 (AutomationTool)

```
상태 9종: DRAFT SUBMITTED AI_REVIEW HUMAN_REVIEW REVISION_REQUIRED
          PILOT APPROVED SUSPENDED RETIRED
```

전환 10개. 각 전환은 `allowsOwner`(만든 사람이 직접 할 수 있는가) 와
`requiredPermission`(필요한 관리 권한) 을 가집니다.

| 전환 | 만든 사람 | 필요 권한 |
|---|---|---|
| DRAFT → SUBMITTED (등록 신청) | ✅ | — |
| SUBMITTED → HUMAN_REVIEW (검토 시작) | | REVIEW |
| HUMAN_REVIEW → REVISION_REQUIRED (보완 요청) | | REVIEW |
| REVISION_REQUIRED → SUBMITTED (재신청) | ✅ | — |
| HUMAN_REVIEW → PILOT (시범운영 승인) | | REVIEW |
| PILOT → APPROVED (정식 승인) | | **MANAGE_TOOLS** |
| APPROVED → SUSPENDED / RETIRED | | MANAGE_TOOLS |
| SUSPENDED → APPROVED / RETIRED | | MANAGE_TOOLS |

**위험도가 CRITICAL 이면 PILOT·APPROVED 로 못 갑니다.** 체크리스트가 아예 없어도 막힙니다.

도구가 가지는 것:
- `runtimeKind` — `WEB` / `DESKTOP` / `MOBILE` / `SCRIPT` / `OTHER`
  (설치가 필요한지가 쓸지 말지를 가르는 첫 질문이라 목록에서 바로 보여준다)
- `recommendedFor: MemberType[]` — 비우면 "누구나"
- `ownerUserId`, `developerUserIds`, `categoryId`, `tags`

**만들지 마세요**: `departmentId`, `visibility`, `operationsManagerUserId`,
`integrations`, `cost`, `performance`, `description`(버전의 `problemStatement` 로 충분)

### 수요 (AutomationDemand)

```
상태 7종: DRAFT OPEN MATCHED IN_DEVELOPMENT PILOT COMPLETED CLOSED
```

- 공개·종료는 **등록자 본인**이 한다. 검토 권한자도 할 수 있다(방치된 수요 정리).
- 개발 단계 전환은 `REVIEW` 권한.
- `offeredTokens` — 완성해 준 사람에게 주고 싶은 토큰
- `containsIdentifiablePersonalData` / `containsAnonymizedPersonalData`
  — 개인정보를 "포함/미포함"으로만 물으면 통계처럼 이미 합쳐진 숫자까지 같은 등급으로
  검토하게 된다. 둘로 나눠 받고 화면에 예시를 든다.
- `DemandComment` — **참여 신청과 별개.** 물어보고 나서 참여할지 정한다.
- `DemandAttachment` — 엑셀 서식 하나가 설명 열 줄보다 빠르다.

**만들지 마세요**: `departmentId`, `systemsInUse`, 참여 형태(`participantRole` 선택 UI)

### 평가 (ToolEvaluation)

**종합 만족도 1항목(1~5점) + 주관식 한 마디.** 끝입니다.

7항목을 다 채우게 하면 부담 때문에 평가 자체를 안 합니다.
점수 하나와 한 문장이 안 쓰인 일곱 점수보다 낫습니다.

- 버전에 붙는다. 새 버전이 나오면 다시 평가할 수 있다.
- 같은 사람·같은 버전 중복을 **3중으로 막는다** (서비스 사전 확인 · 저장소 저장 직전
  재확인 · DB 부분 유니크 인덱스).
- 시범운영·정식 승인 상태에서만 가능.
- 수정하면 이력이 남는다. **이력을 먼저 쓰고 본문을 갱신한다.**
- **작성자를 화면에 표시하지 않는다.**

### 개선 요청 (ImprovementRequest)

```
상태 7종: OPEN REVIEWING ACCEPTED IN_PROGRESS RELEASED REJECTED CLOSED
```

등록되는 순간 **도구를 만든 사람에게 자동으로 배정**됩니다. 배정 화면을 만들지 마세요.

### 토큰 (RewardEntry)

- 원장은 **append-only**. 잔액 컬럼을 두지 않고 기록을 더해서 계산한다.
  잔액만 들고 있으면 "왜 이 숫자가 됐는지"를 못 밝힌다.
- 종류: `GRANT`(가입 지급) / `AWARD`(수여)
- **한 수요에 한 번만** 수여한다. 3중 확인.
- 수요를 올린 본인만, 자기가 만든 도구가 아닌 것에만 줄 수 있다.
- 차감 개념이 없다. 음수를 DB 제약으로 막는다.

### 공지 (Notice)

내린 공지는 **지우지 않고 감춘다** (`isPublished`). 무엇을 공지했는지는 남아야 한다.

### 위험 체크리스트 14항목

사람이 직접 판단합니다. 화면의 "참고용 제안 등급"은 체크된 항목 수를 세는 단순 규칙이고,
**"AI 분석 결과가 아니다"라고 화면에 명시**합니다. 저장되는 값은 검토자가 고른 등급입니다.

```
 1 개인정보 사용                    8 실행 로그 부재
 2 성적·상담·인사정보 사용          9 사람이 확인하지 않는 자동 실행
 3 연구보안 정보 사용              10 학생 선발·평가·불이익 결정
 4 외부 LLM 또는 API 전송          11 비용 지출 자동 승인
 5 해외 서버 저장                  12 외부 이메일 자동 발송
 6 데이터 보관기간 미설정          13 파일 삭제 또는 원본 변경
 7 사용자별 접근통제 부재          14 관리자 권한 사용
```

**해당된다고 체크한 항목에는 통제 방안 입력을 강제**합니다. 체크만 하고 넘어가면
나중에 무엇을 확인했는지 알 수 없습니다.

### 데이터 분류 8종

```
PUBLIC INTERNAL PERSONAL ACADEMIC GRADE COUNSELING RESEARCH FINANCIAL
```

`PERSONAL GRADE COUNSELING RESEARCH FINANCIAL` 은 민감 분류로 취급합니다.

---

## 1.6 화면 목록 (22개 라우트)

```
/                        → /home 리다이렉트
/login                   데모 계정 카드 6개 (비밀번호 없음)
/signup                  신분만 받는 가입 (DEMO 모드만)

/home                    ★ 첫 화면 — 랜딩
  · 히어로 + 도구 둘러보기 / 필요한 것 요청하기 / 내 토큰
  · 처음 온 사람에게만 3단계 이용 가이드
  · 공지 3건
  · 도구: [내 신분에 맞는 도구] [많이 쓰는 도구]
  · 수요: [최근 올라온 요청] [사람이 모이는 요청]

/dashboard               지표 — "필요한 것을 찾을 때" / "만들어 볼 때" 두 관점
/tools                   목록 (카드/표 전환, URL 에 검색 조건 전부)
/tools/new               등록 위저드 4단계
/tools/[id]              상세 — 탭 5개
/tools/[id]/edit
/demands                 목록
/demands/new
/demands/[id]            상세 + 문의 + 토큰 수여
/demands/[id]/edit
/reviews                 검토 큐 — 미검토/검토중/수정보완/검토완료 4분류 버튼
/reviews/[id]            검토 화면 (위험 체크리스트 14항목)
/improvements
/improvements/[id]
/notices                 공지 게시판
/admin                   현황
/admin/users             계정 권한 변경
/admin/categories
/admin/audit-logs
```

### 도구 등록 위저드 — 4단계

```
1 기본 정보      이름 · 한 줄 소개 · 카테고리 · 실행 방식 · 추천 대상 · 태그
                 · 해결하려는 문제 · 서비스 URL · 저장소 URL
2 기능과 업무 흐름 주요 기능 · 자동화 수준 · 현재/자동화 후 흐름 · 입력/결과물 · 예상 사용자
3 다루는 데이터   데이터 분류 · 외부 전송 · 저장 위치 · 보관 기간 · 실행 로그 · 사람 확인
4 첨부와 확인     첨부파일 · 버전 라벨 · 변경 사항 · 최종 확인
```

**만들지 마세요**: 비용과 성과 단계, 연동 시스템 단계

### 도구 상세 — 탭 5개

```
개요        ← 펼쳐보기 4개: [기본 정보(펼침)] [기능] [업무 흐름] [버전]
데이터·보안
평가        ← 종합 점수를 크게, 익명
개선 요청
활동 이력
```

`<details>` 를 그대로 씁니다. 자바스크립트 없이 열리고 `Ctrl+F` 로도 찾힙니다.

---

## 1.7 계층 구조 — ESLint 가 강제합니다

```
src/domain/        의존성 0. 타입 · 상태머신 · 권한 정책. 순수 함수만.
    ↑
src/repositories/  9개 인터페이스 + DEMO·Supabase 양쪽 구현
    ↑
src/application/   서비스. 여기서 assertCan() 을 부른다.
    ↑
src/actions/       얇은 진입점. run() + parseOrThrow() + withAudit()
    ↑
src/app/           화면. 페이지 로더는 guardPage() 로 감싼다.
```

**막아야 할 것 (ESLint `no-restricted-imports`)**

- `src/domain/` 안에서 다른 계층·React·Next·`server-only` 를 import 하지 못하게
- UI 에서 `@/repositories/*` 를 직접 import 하지 못하게
  (권한 검사와 감사 로그를 우회하게 됨)

### 서버 액션 형태

```ts
export async function doSomethingAction(input: unknown): Promise<ActionResult<T>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(someSchema, input);

    const result = await withAudit(
      actor,
      {
        action: 'domain.verb',
        targetType: 'tool',
        targetId: data.id,
        changedFields: ['status'],   // 값이 아니라 이름만
        summary: '무엇을 했는지 한 줄',
      },
      () => someService(actor, data),  // 권한 검사는 서비스 안에서
    );

    revalidatePath('/relevant-path');
    return result;
  });
}
```

### 페이지 로더 형태

```tsx
export default async function SomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await guardPage(() => loadSomething(id));
}
```

`guardPage()` 가 `UNAUTHENTICATED` → `/login`, `FORBIDDEN`·`NOT_FOUND` → 404 로 바꿉니다.

---

## 1.8 한국어 UI 규칙

- 오류 메시지는 **"무엇이 잘못됐는지 + 어떻게 고치는지"** 두 부분으로.
- 개발자 용어를 쓰지 않는다. 화면에 그대로 나가는 문장이다.
- 상태는 **텍스트 + 아이콘 + 색** 3중으로. 색만으로 구분하지 않는다.
- 값이 없을 때 0 으로 채우지 않는다.
- **조사를 `은(는)` 으로 쓰지 않는다.** 받침을 보고 고르는 `josa()` 헬퍼를
  `domain/shared/josa.ts` 에 만들어 쓴다. (domain 안에서도 쓰므로 domain 에 둔다)

---

# 2부 — 붙여 넣을 프롬프트

> 각 단계 끝에서 `pnpm lint && pnpm typecheck && pnpm test` 를 돌리고 커밋합니다.
> 실패하면 다음 단계로 넘어가지 마세요.

## 프롬프트 0 — 환경 확인 (사람이 직접)

```powershell
node -v          # 20 이상. 24.14.1 에서 검증됨
npm i -g pnpm    # corepack enable 은 쓰지 마세요 (아래 참고)
pnpm -v
```

> **corepack 을 쓰지 마세요.** Windows 에서 `C:\Program Files\nodejs` 쓰기 권한이 없어
> `EPERM` 으로 실패합니다. `npm i -g pnpm` 으로 설치하세요.

---

## 프롬프트 1 — 프로젝트 뼈대

```
대학 구성원이 만든 업무 자동화 도구를 공유하고, 없으면 요청해서 함께 만드는
웹 플랫폼을 만듭니다. 한국어 UI 입니다.

지금은 1단계 — 프로젝트 뼈대만 세웁니다. 기능은 아직 만들지 마세요.

기술 스택 (버전을 정확히 지켜 주세요. 올리지 마세요):
- Next.js 16.2.12 (App Router, Turbopack)
- React 19.2.8 / TypeScript 5.9.3
- Tailwind CSS 4.3.3 — CSS-first. tailwind.config.js 를 만들지 마세요.
  토큰은 src/app/globals.css 의 @theme 블록에 둡니다.
- ESLint 9.39.5 — 10.x 로 올리지 마세요. eslint-plugin-react 가 제거된 API 를
  호출해 lint 가 전면 실패합니다.
- zod 4.4.3, react-hook-form 7.83.0, @hookform/resolvers 5.5.7
- radix-ui 1.6.7 (통합 패키지), class-variance-authority, clsx, tailwind-merge
- lucide-react, vitest 4.1.10, @playwright/test 1.62.0
- @supabase/supabase-js, @supabase/ssr (아직 연결하지 않습니다)
- shadcn CLI 를 쓰지 마세요. radix-ui + CVA 로 src/components/ui/ 에 직접 만듭니다.

해 주세요:
1. pnpm 프로젝트 초기화. 스크립트: dev build start lint lint:fix typecheck
   format format:check test test:watch test:e2e demo:reset
2. tsconfig — strict + noUncheckedIndexedAccess, @/* → src/*
3. eslint.config.mjs — flat config. 여기에 **계층 경계 규칙**을 넣습니다:
   - src/domain/** 는 @/app @/actions @/application @/components @/repositories
     @/adapters @/lib 및 react react-dom next next/* server-only 를 import 할 수 없다
   - src/components/** 와 src/app/** 는 @/repositories/* 를 import 할 수 없다
     (권한 검사와 감사 로그를 우회하게 되므로)
   두 규칙 모두 어겼을 때 이유를 설명하는 한국어 message 를 넣어 주세요.
4. next.config.ts — 보안 헤더 4종, serverActions bodySizeLimit 4mb
5. vitest.config.ts — node 환경. 테스트는 항상 DEMO 모드로 강제.
   server-only 패키지는 Next 밖에서 import 하면 예외를 던지므로
   tests/stubs/server-only.ts 로 별칭 처리합니다.
6. playwright.config.ts — 포트 3100, workers:1, 격리 데이터 디렉터리 .data-e2e
7. .env.example, .gitignore (.data/ .data-e2e/ .env 포함), .prettierrc.json
8. scripts/reset-demo.mjs — .data 디렉터리를 지우는 스크립트

끝나면 pnpm lint / typecheck 가 통과하는지 확인해 주세요.
```

---

## 프롬프트 2 — 도메인 계층

```
2단계 — src/domain/ 을 만듭니다. **의존성 0 입니다.** 순수 타입과 함수만 두세요.

핵심 원칙부터 말씀드립니다. 이걸 어기면 다른 물건이 됩니다:
- 이용자끼리 구분하지 않습니다. 한 사람이 수요도 올리고 도구도 만듭니다.
  판단 기준은 둘뿐입니다: 내가 만든 것인가(소유권), 그 권한을 받았는가(관리 권한).
- 관리 권한은 운영 권한이지 저작 권한이 아닙니다. 관리자도 남의 도구 내용이나
  남이 쓴 평가는 못 고칩니다.

만들 것:

authz/accounts.ts
  AccountType 'USER' | 'ADMIN'
  AdminPermission 6종: REVIEW MANAGE_USERS MANAGE_CATEGORIES MANAGE_TOOLS
                       MANAGE_NOTICES VIEW_AUDIT
  MemberType 4종: STUDENT STAFF PROFESSOR EXTERNAL  ← 권한이 아닙니다.
                  "누구에게 맞는 도구인지" 가리는 데만 씁니다.
  각각 한국어 라벨과 설명. hasAdminPermission(), canEnterAdminArea(),
  PermissionHolder 인터페이스.
  ※ 권한을 하나도 못 받은 관리자 계정은 이용자와 같아야 합니다.

authz/actions.ts   권한 검사 대상 동작 목록 (tool:* review:* demand:*
                   evaluation:* improvement:* admin:*)
authz/policies.ts  Actor { id, accountType, adminPermissions, campusId }
                   can() / assertCan(). switch 문에 never 로 누락을 막으세요.

shared/ids.ts       브랜디드 ID 타입 + asId() + newId()
shared/errors.ts    DomainError. 코드: UNAUTHENTICATED FORBIDDEN NOT_FOUND
                    CONFLICT PRECONDITION_FAILED VALIDATION_FAILED
                    INVALID_STATUS_TRANSITION
shared/pagination.ts
shared/josa.ts      ★ 한국어 조사 헬퍼. 받침을 보고 은/는, 이/가, 을/를, 과/와 를
                    고릅니다. 숫자와 알파벳도 읽는 소리를 따르게 하세요
                    (1=일 받침있음, 2=이 없음, L=엘 있음, AI=아이 없음).
                    화면에 "은(는)" 이 나가면 안 됩니다.

tool/types.ts       상태 9종 DRAFT SUBMITTED AI_REVIEW HUMAN_REVIEW
                    REVISION_REQUIRED PILOT APPROVED SUSPENDED RETIRED
                    RuntimeKind: WEB DESKTOP MOBILE SCRIPT OTHER
                    DataClassification 8종 (PUBLIC INTERNAL PERSONAL ACADEMIC
                    GRADE COUNSELING RESEARCH FINANCIAL)
                    AutomationTool 은 runtimeKind, recommendedFor: MemberType[],
                    ownerUserId, developerUserIds, categoryId, tags 를 가집니다.
                    ※ departmentId, visibility, operationsManagerUserId 는
                      만들지 마세요.
tool/status-machine.ts  전환 10개. 각 규칙은 allowsOwner 와
                    requiredPermission(AdminPermission|null) 을 가집니다.
                    등록 신청·재신청은 만든 사람이, 검토 흐름은 REVIEW,
                    정식 승인·중지·폐기는 MANAGE_TOOLS.
                    위험도 CRITICAL 이면 PILOT/APPROVED 차단.
                    체크리스트가 없어도 차단.
tool/risk-checklist-rules.ts  14항목 (목록은 아래)

demand/types.ts     상태 7종 DRAFT OPEN MATCHED IN_DEVELOPMENT PILOT
                    COMPLETED CLOSED. offeredTokens,
                    containsIdentifiablePersonalData /
                    containsAnonymizedPersonalData 로 개인정보를 둘로 나눔.
                    DemandComment, DemandAttachment 도 여기에.
demand/status-machine.ts  공개·종료는 등록자 본인 + REVIEW 권한자
evaluation/types.ts 종합 만족도 1항목만. 1~5점.
                    ※ 7항목으로 만들지 마세요.
evaluation/scoring.ts
improvement/types.ts + status-machine.ts
identity/types.ts   Profile { accountType, adminPermissions, memberType, ... }
                    ※ departmentId 없음
notice/types.ts     내린 공지는 지우지 않고 isPublished 로 감춤
reward/types.ts     RewardEntry (GRANT|AWARD) + sumBalance().
                    잔액을 저장하지 않고 기록을 더해서 계산합니다.
observability/types.ts  AuditLog, Notification, DashboardStats
review/types.ts

위험 체크리스트 14항목:
1 개인정보 사용 / 2 성적·상담·인사정보 사용 / 3 연구보안 정보 사용
4 외부 LLM 또는 API 전송 / 5 해외 서버 저장 / 6 데이터 보관기간 미설정
7 사용자별 접근통제 부재 / 8 실행 로그 부재 / 9 사람이 확인하지 않는 자동 실행
10 학생 선발·평가·불이익 결정 / 11 비용 지출 자동 승인 / 12 외부 이메일 자동 발송
13 파일 삭제 또는 원본 변경 / 14 관리자 권한 사용

단위 테스트도 함께 써 주세요:
- 상태 전환 10개 + 무효 전환 거부 + 권한 제약 + CRITICAL 차단
- 권한 매트릭스: 이용자가 할 수 있는 일 / 소유권으로 갈리는 일 / 못 하는 일,
  권한별로 되는 것과 안 되는 것, 권한 없는 관리자는 이용자와 같다,
  소유권은 관리 권한으로 넘지 못한다
- josa() 의 받침 판단
```

---

## 프롬프트 3 — 저장소 계층

```
3단계 — src/repositories/ 를 만듭니다.

src/repositories/types/index.ts 에 인터페이스를 두고,
demo/ 와 supabase/ **양쪽을 모두** 구현합니다. 한쪽만 만들지 마세요.

인터페이스: IdentityRepository ToolRepository ReferenceDataRepository
ReviewRepository DemandRepository EvaluationRepository ImprovementRepository
ObservabilityRepository RewardRepository NoticeRepository FileStorage

DEMO 저장소:
- .data/demo-db.json 파일 하나에 전부 담습니다.
- 쓰기는 뮤텍스로 직렬화하고 임시파일 → rename 으로 원자적으로 씁니다.
- store.ts 상단에 turbopackIgnore 주석을 넣으세요. 없으면 Turbopack 이
  프로젝트 전체를 추적해 빌드 경고를 냅니다.
- 시드 데이터: 계정 6 · 카테고리 6 · 도구 6 · 수요 4 · 평가 4 · 개선요청 3 ·
  위험 체크리스트 2 · 감사 로그 10 · 공지 3 · 토큰 기록 5 · 수요 문의 3
  · 도구명과 수요 제목에 [예시] 접두어를 붙여 가상 데이터임을 표시
  · 이메일은 RFC 2606 예약 도메인 demo.university.test 를 씁니다
  · 감사 로그를 빈 배열로 두지 마세요. 관리자 화면이 처음부터 비어 보입니다.
  · 데모 계정 6개는 권한을 서로 다르게:
      김개발 정연구 박수요 한상담 → 이용자 (관리 권한 없음)
      이검토 → 관리자이지만 REVIEW 권한만
      최관리 → 관리자, 전체 권한
    신분도 섞어 주세요 (교직원/교수/학생).

Supabase 저장소:
- @supabase/ssr 로 서버 클라이언트를 만듭니다.
- 상단 주석에 "실제 프로젝트에 연결해 검증한 적이 없음" 경고를 남기세요.

토큰 저장소는 insert 만 노출합니다. 수정·삭제 메서드를 두지 마세요 (append-only).
AWARD 는 한 수요에 한 번만 — 저장 직전에 다시 확인하세요.

DEMO/Supabase 분기는 src/lib/di/container.ts 한 곳에만 둡니다.
```

---

## 프롬프트 4 — 인증

```
4단계 — 인증.

src/lib/auth/
  session.ts        HMAC-SHA256 서명 쿠키 (DEMO 전용).
                    서명 불일치·만료는 전부 null 로 처리.
  demo-auth.ts      isDemoAccount 인 계정으로만 로그인 가능
  supabase-auth.ts  @supabase/ssr. getUser() 를 쓰세요.
                    getSession() 은 쿠키를 그대로 믿어서 쓰면 안 됩니다.
  current-user.ts   getCurrentProfile() / requireUser() / requirePermission()
                    / toActor() / canProfile()
  page-guard.ts     guardPage() — UNAUTHENTICATED → /login 리다이렉트,
                    FORBIDDEN·NOT_FOUND → 404

DEMO/Supabase 분기는 container.ts 와 current-user.ts **두 곳에만** 둡니다.

src/lib/utils/datetime.ts 도 만들어 주세요.
날짜를 각 화면에서 직접 포맷하지 않고 여기를 거칩니다.
timeStyle 만 주면 Node 의 ICU 버전에 따라 "오전" 대신 "AM" 이 나옵니다
(Node 24 에서 실제로 겪었습니다). hour12: false 를 명시해 24시간제로 고정하고,
AM/PM 이 절대 안 들어가는지 테스트로 막아 주세요.
```

---

## 프롬프트 5 — 디자인 시스템

```
5단계 — UI 기본 요소. radix-ui + CVA 로 직접 만듭니다 (shadcn CLI 금지).

src/components/ui/  button field(Input/Textarea/NativeSelect/Field) card badge
                    alert table dialog tabs checkbox radio-group select tooltip
                    skeleton empty-state pagination
src/components/common/  status-badge phase-notice string-list-input
                        unsaved-changes-guard
src/components/layout/  demo-banner sidebar topbar account-badge notification-bell
src/components/dashboard/  stat-card bar-list

지킬 것:
- 모든 상태 배지는 한국어 라벨 + 고유 아이콘 + 색 **3중**으로. 색만으로 구분 금지.
- 민감 데이터 분류는 자물쇠 아이콘 + 텍스트 칩.
- 차트 라이브러리를 쓰지 마세요. CSS 막대 + 숫자 라벨 + <table> 마크업으로 만듭니다.
- 빈 상태에는 다음 행동 CTA 를, 로딩에는 skeleton 을, 오류에는 내부 정보를 노출하지 않기.
- "본문으로 건너뛰기" 링크, :focus-visible 링, prefers-reduced-motion 대응.
- 좁은 화면에서는 사이드바 대신 상단 가로 스크롤 메뉴.

phase-notice 는 아직 없는 AI 기능 자리에 쓰는 안내입니다.
"○○은 2단계에서 제공될 예정입니다" + "아직 분석 결과가 없습니다. 이 영역에 표시할
점수나 판정값을 임의로 만들지 않습니다." 조사는 josa() 로 붙이세요.
```

---

## 프롬프트 6 — 도구 등록과 목록

```
6단계 — 도구 등록 위저드와 목록·상세.

위저드는 **4단계**입니다:
1 기본 정보 — 이름 · 한 줄 소개 · 카테고리 · 실행 방식 · 추천 대상(체크박스) ·
              태그 · 해결하려는 문제 · 서비스 URL · 저장소 URL
2 기능과 업무 흐름 — 주요 기능 · 자동화 수준 · 현재/자동화 후 흐름 ·
              입력 자료 · 결과물 · 예상 사용자
3 다루는 데이터 — 데이터 분류 · 외부 전송 · 저장 위치 · 보관 기간 ·
              실행 기록 · 사람 최종 확인
4 첨부와 확인 — 첨부파일 · 버전 라벨 · 변경 사항 · 최종 확인

※ 비용·성과 단계와 연동 시스템 단계는 만들지 마세요.
※ 담당 부서, 운영 책임자, 공개 범위, 도구 설명, 월 예상 사용 횟수도 만들지 마세요.

지킬 것:
- **검증 규칙은 한 벌.** toolDraftSchema(임시저장) 와 toolSubmitSchema(신청) 의
  출력 타입을 같게 하고, 클라이언트의 단계별 검사도 같은 스키마 결과에서
  해당 단계 필드만 골라 씁니다.
- **임시저장은 이름만 있으면 됩니다.** 작성 도중 저장을 막으면 작업이 날아갑니다.
- 첨부 형식·크기를 서버에서 다시 검사합니다. 허용 목록 방식이고 SVG 는 제외합니다
  (스크립트를 품을 수 있음).
- 저장 경로에 사용자가 정한 파일명을 쓰지 마세요.
  {toolId}/{versionId}/{attachmentId}.{확장자} 로만 만들고 표시용 이름은 별도 컬럼에.

목록:
- 검색 조건이 **전부 URL** 에 있어야 합니다. 주소만 복사해 공유할 수 있고
  뒤로가기·새 탭이 자연스럽게 동작해야 합니다. 잘못된 값이 들어오면 오류 대신
  기본값으로 되돌리세요 — 주소창은 누구나 고칠 수 있습니다.
- 정렬: 최근 등록순 / 많이 쓰는 순 / 평가 좋은 순 / 이름순
- 카드와 표 두 가지 보기. 카드에 실행 방식과 추천 대상을 보여줍니다.
- "내 도구 공유하기" 버튼을 눈에 띄게 두세요.
- 평가가 없으면 0점이 아니라 "평가 없음".

상세 — **탭 5개**:
  개요(펼쳐보기 4개: 기본 정보/기능/업무 흐름/버전) · 데이터·보안 ·
  평가 · 개선 요청 · 활동 이력
펼쳐보기는 <details> 를 그대로 쓰세요. JS 없이 열리고 Ctrl+F 로도 찾힙니다.
목록으로 돌아가는 링크를 상단에 두세요.

**src/app/(app)/tools/ 에 loading.tsx 를 만들지 마세요.**
하위 경로까지 로딩 경계가 내려가 응답 헤더가 먼저 나가고,
/tools/[id] 의 notFound() 가 404 대신 200 을 반환합니다.
로딩 표시가 필요하면 목록 페이지 안에서 <Suspense> 를 쓰세요.
같은 이유로 **권한 검사를 <Suspense> 안에서 하지 마세요.**
```

---

## 프롬프트 7 — 검토 워크플로

```
7단계 — 검토.

/reviews 검토 큐:
- 상단에 [전체][미검토][검토 중][수정 보완][검토 완료] 버튼. 누르면 그 칸만 보이고
  주소에 남습니다(?stage=). 목록 정렬도 그 순서로.
- 각 항목에 경과일, "체크리스트 미작성", "민감정보" 표시.
- 부서 대신 만든 사람을 보여주세요.

/reviews/[id] 검토 화면:
- 위험 체크리스트 14항목을 사람이 직접 판단합니다.
- "참고용 제안 등급"을 보여주되 **화면에 "AI 분석 결과가 아니다"라고 명시**하세요.
  체크된 항목 수를 세는 단순 규칙일 뿐입니다. 저장되는 값은 검토자가 고른 등급입니다.
- 해당된다고 체크한 항목에는 통제 방안 입력을 강제합니다.
- CRITICAL 로 확정하면 PILOT·APPROVED 전환이 서버에서 막힙니다.
- 상태 전환 버튼 목록은 화면이 스스로 판단하지 않고
  도메인의 availableTransitions() 가 계산한 것을 씁니다.

알림:
- 본문에 사유 원문을 담지 마세요. 알림은 목록에 오래 남습니다.
  "무슨 일이 있었는지"와 링크만 넣고 자세한 내용은 따라가서 보게 합니다.

검토자는 자기 자신에게만 배정합니다.
남에게 배정하려면 MANAGE_USERS 권한도 있어야 합니다.
```

---

## 프롬프트 8 — 수요 · 평가 · 개선 요청

```
8단계.

수요 등록 (한 화면 폼, 위저드 아님):
- 제목 · 현재 처리 방식 · 가장 번거로운 단계 · 다루는 자료 · 원하는 결과물
  · 업무 주기 · 예상 사용 인원 · 꼭 필요한 기능 · 있으면 좋은 기능 · 기대 효과
- **희망 완료 시기는 [1주][2주][3주][4주][직접 지정] 버튼**으로. 날짜 입력만 두면
  스스로 계산해야 합니다. 대부분 "이번 달 안" 정도의 감각으로 적습니다.
- **희망 수여 토큰** — 완성해 준 사람에게 주고 싶은 양
- 개인정보 체크를 둘로 나누고 예시를 붙이세요:
  · "사람을 특정할 수 있는 정보" (예: 이름, 학번, 사번, 연락처, 상담 내용)
  · "사람을 특정할 수 없는 형태로만" (예: 학과별 인원수, 만족도 평균)
- 자료 첨부 가능
※ 요청 부서와 사용 중인 시스템은 만들지 마세요.

수요-도구 연결:
- **자동 추천이 아닙니다.** 검토자가 목록에서 직접 고르고, 연결 유형 5종 중
  하나를 선택하고, 왜 그렇게 판단했는지 10자 이상 적습니다.
  유사도 점수 같은 값을 만들거나 보여주지 마세요.
- 화면에 "자동 추천은 2단계 몫"이라고 명시합니다.
- 연결은 REVIEW 권한자만.

수요 문의 (댓글):
- **참여 신청과 별개입니다.** 물어보고 나서 참여할지 정합니다.
- 작성자 이름과 신분 배지를 함께 보여줍니다.
- 지운 글은 감추기만 합니다. 통째로 사라지면 남은 답글이 이상해집니다.
- 자기 글만 지울 수 있고, REVIEW 권한자는 부적절한 글을 정리할 수 있습니다.

개발 참여 신청:
- 참여 형태를 고르게 하지 마세요. 메시지도 선택입니다.
  필수로 두면 "돕고 싶습니다" 같은 빈 문장만 쌓입니다.

평가:
- **종합 만족도 1항목 + 주관식 한 마디.** 7항목으로 만들지 마세요.
- **익명입니다.** 작성자를 화면에 표시하지 않고, 폼에 "익명으로 남습니다"라고
  알려 주세요. 그래야 솔직하게 씁니다.
- 점수 라디오의 접근성 이름을 "4점 우수"처럼 붙이세요.
  숫자만 두면 스크린리더가 "4우수"로 읽습니다.
- 시범운영·정식 승인 상태에서만 가능. 버전에 붙습니다.
- 중복을 3중으로 막습니다.
- 수정하면 이력이 남습니다. **이력을 먼저 쓰고 본문을 갱신하세요.**
- 평가·개선 요청 버튼은 탭 안이 아니라 **상단**에 둡니다.
  radix Tabs 는 비활성 탭을 언마운트하므로 탭을 열어야만 보입니다.
- 감사 로그에 점수와 의견 내용을 담지 마세요.

개선 요청:
- 등록되는 순간 **도구를 만든 사람에게 자동 배정**됩니다.
  담당자 배정 화면을 만들지 마세요.

토큰 수여:
- 수요를 올린 본인만, 연결된 도구 하나를 골라 줍니다.
- **한 수요에 한 번만.** 되돌릴 수 없으니 확인 문구를 분명히.
- 자기가 만든 도구에는 못 줍니다.
```

---

## 프롬프트 9 — 관리자 화면

```
9단계 — 관리.

/admin           현황
/admin/users     계정 권한 변경
/admin/categories
/admin/audit-logs

지킬 것:
- **관리 탭은 받은 권한만 보여줍니다.** 보여 놓고 눌렀을 때 404 가 나면
  고장 난 것처럼 보입니다.
- **권한 검사를 <Suspense> 안에서 하지 마세요.** 응답 헤더가 먼저 나가
  notFound() 가 404 대신 200 을 반환합니다. 페이지 본문에서 먼저
  guardPage(() => requirePermission(...)) 을 부르세요.
- 자기 권한은 스스로 못 바꿉니다. 자기 계정도 비활성화할 수 없습니다
  (즉시 로그아웃되어 되돌릴 수 없음).
- "마지막 관리자 보호" 검사는 넣지 마세요. 이 함수를 부르려면 행위자가
  권한을 가져야 하고 자기 권한은 못 바꾸므로 어떤 경우에도 행위자가 남습니다.
  검사를 넣으면 오히려 비활성 관리자를 정리하는 정상 작업까지 막힙니다.
- **권한 변경은 사유 입력이 필수**이고 사유가 감사 로그에 그대로 남습니다.
- 이용자로 내리면 관리 권한을 함께 비웁니다.
- 감사 로그 필터 후보는 **전체 로그에서** 뽑습니다. 현재 페이지에서 뽑으면
  필터를 걸수록 후보가 줄어드는 이상한 화면이 됩니다.
- 감사 로그 빈 상태를 **필터 유무로 갈라서** 안내하세요. 필터를 안 걸었는데
  "필터를 해제해 보세요"라고 하면 있지도 않은 필터를 찾게 됩니다.
```

---

## 프롬프트 10 — 랜딩 · 공지 · 회원가입

```
10단계 — 첫 화면과 나머지.

/home 을 **첫 화면**으로 만듭니다 (/ 와 로그인 후 도착지 모두 여기로).
대시보드는 사이드바에서 따로 들어갑니다.

랜딩 구성 — 지표 숫자 대신 **지금 눌러 볼 것**을 앞세웁니다:
- 히어로: 인사 + 한 줄 설명 + [도구 둘러보기] [필요한 것 요청하기] + 내 토큰
- 처음 온 사람에게만 3단계 이용 가이드
  (도구도 수요도 올린 적 없으면 처음으로 봅니다)
- 공지 3건
- 도구 파트: [내 신분에 맞는 도구] [많이 쓰는 도구]
- 수요 파트: [최근 올라온 요청] [사람이 모이는 요청]

★ "추천"은 AI 가 고른 것이 아닙니다. 등록자가 표시해 둔 추천 대상을 그대로 씁니다.
  유사도 점수를 만들지 마세요. 화면 문구에도 "등록한 사람이 표시해 둔 추천 대상을
  기준으로 고릅니다"라고 적어 주세요.
★ 이미지 에셋은 나중에 받습니다. 지금은 기능만 세우세요.

/notices 공지 게시판:
- MANAGE_NOTICES 권한자만 쓰고 내립니다.
- 내린 공지는 **지우지 않고 감춥니다.** 관리자에게는 계속 보입니다.
- 고정 공지가 먼저, 그다음 최신순.

/signup 회원가입:
- **신분(학생/교직원/교수/일반인)만 받습니다.** 비밀번호를 다루지 마세요.
  SSO 가 들어올 자리라 지금 흉내 내지 않습니다.
- 가입은 언제나 이용자로 시작합니다. 관리 권한은 관리자가 따로 부여합니다.
- Supabase 모드에서는 가입 폼 대신 "관리자에게 요청" 안내를 보여줍니다.

대시보드 지표는 **"필요한 것을 찾을 때" / "만들어 볼 때"** 두 관점으로 나눕니다.
한 사람이 두 역할을 다 하므로 계정이 아니라 관점으로 나눕니다.
보유 토큰 카드도 여기에 둡니다.
```

---

## 프롬프트 11 — 테스트와 마무리

```
11단계 — 테스트와 문서.

통합 테스트 (tests/integration/):
- **application 서비스를 직접 부릅니다.** 서버 액션은 next/headers 에 의존해
  vitest 에서 돌지 않습니다. 실제 규칙은 전부 application 계층에 있으므로
  검증 범위는 줄지 않습니다.
- setupIsolatedStore() / teardownIsolatedStore() 로 격리합니다.
- 세션이 필요하면 vi.mock('@/lib/auth/current-user') 로 requireUser 만
  갈아 끼우고 권한 판단 로직은 진짜를 씁니다.

커버할 것: 도구 등록 · 목록 조회 · 검토 워크플로 · 수요 매칭 ·
평가/개선요청 · 관리자 · 토큰/공지/문의

E2E (Playwright, Chromium):
1. 전체 흐름: 로그인 → 도구 등록 → 검토자 보완요청 → 재신청 →
   체크리스트 작성 → 시범운영 승인 → 평가 → 개선요청 → 관리자 감사로그 확인
2. 관리 권한 없는 이용자는 관리 화면에 못 들어가지만 **도구 등록은 된다**
   (이게 권한 재설계의 핵심입니다)
3. 검토 권한만 받은 관리자는 관리 안에서 '현황' 탭만 보인다

E2E 를 쓸 때 주의:
- 사이드바 이동 후 **이동 완료를 기다리세요.** 안 기다리면 이전 화면(대시보드의
  최근 활동 목록)에서 엉뚱한 요소를 잡습니다. 본문 영역으로 범위도 좁히세요.
- 익명 평가를 확인할 때 상단바에 로그인한 사람 이름이 있으므로
  본문으로 범위를 좁혀야 합니다.

문서 (docs/):
ARCHITECTURE DATA_MODEL SECURITY SETUP WORKFLOW AI_ROADMAP TESTING
DEMO_SCENARIO DECISIONS PROGRESS + 루트에 README, CLAUDE.md

CLAUDE.md 에는 "절대 하지 말 것"을 명확히 적어 주세요.
```

---

## 프롬프트 12 — Supabase 마이그레이션 (선택)

```
12단계 — Supabase 스키마. **실제 DB 에 적용하지 않습니다.** 파일만 만듭니다.

supabase/migrations/ 에 번호순으로:
- 확장·열거형, 조직·계정, 도구, 도구 상세, 도구 워크플로, 수요, 피드백,
  관측, 2·3단계 예약, 인덱스, RLS 정책, 참조 시드
- 계정 권한(account_type / admin_permission / member_type)
- 토큰 원장, 공지, 수요 문의, 수요 첨부

지킬 것:
- tool_status_history / audit_logs / evaluation_history / reward_ledgers 는
  트리거로 수정·삭제를 **DB 차원에서 차단** (append-only)
- 평가 중복 방지는 부분 유니크 인덱스
- 토큰 AWARD 는 수요당 하나 — 부분 유니크 인덱스
- 토큰 금액은 양수만 (차감 개념이 없으므로 음수가 들어오면 잔액이 뒤집힘)
- 전 테이블 RLS + 헬퍼 함수
  (has_admin_permission / current_account_type / is_admin / current_campus_id)
- user_roles_admin_write 정책에 user_id <> auth.uid() 조건
  (애플리케이션의 "자기 권한은 못 바꾼다"와 같은 규칙)

각 파일 상단에 "실제 프로젝트에 적용된 적 없음. 적용 전 SECURITY.md 의
RLS 검증 체크리스트를 먼저 밟을 것" 경고를 남기세요.
```

---

# 3부 — 절대 하지 말 것 (요약)

새 컴퓨터의 에이전트에게 **매 세션 처음에** 이 목록을 주세요.

## 의존성

- **ESLint 를 10.x 로 올리지 마세요.** `eslint-plugin-react@7.37.5`
  (eslint-config-next 의존)가 제거된 `context.getFilename()` 을 호출해
  `pnpm lint` 가 전면 실패합니다.
- **TypeScript 를 7.x 로 올리지 마세요.** 네이티브 포팅 릴리스라
  `typescript-eslint@8` 호환 리스크가 있습니다.
- **`tailwind.config.js` 를 만들지 마세요.** v4 CSS-first 입니다.
- **`corepack enable` 을 쓰지 마세요.** Windows 에서 EPERM 으로 실패합니다.
- **shadcn CLI 를 쓰지 마세요.**

## 구조

- **`src/domain/` 에서 무엇도 import 하지 마세요.** 의존성 0 을 유지합니다.
- **UI 에서 `@/repositories/*` 를 import 하지 마세요.** 권한 검사와 감사 로그를
  우회하게 됩니다.
- ESLint 가 위 둘을 강제합니다. 규칙을 끄지 마세요.

## 라우팅

- **`app/(app)/tools/` 에 `loading.tsx` 를 만들지 마세요.**
- **권한 검사를 `<Suspense>` 안에서 하지 마세요.**
  둘 다 `notFound()` 가 404 대신 200 을 반환하게 만듭니다.

## 요구사항

- **가짜 AI 결과를 만들지 마세요.**
- **데모 데이터에 실제 개인정보를 넣지 마세요.** (`demo.university.test`)
- **감사 로그에 값을 넣지 마세요.** 필드 이름만. (예외: 권한 변경 사유)
- **관리자 작업을 감사 로그에서 빼지 마세요.**
- **평가 작성자를 화면에 보여주지 마세요.**
- **조사를 `은(는)` 으로 쓰지 마세요.** `josa()` 를 쓰세요.
- **날짜를 직접 포맷하지 마세요.** `lib/utils/datetime.ts` 를 쓰세요.

## 만들지 말아야 할 것 (지웠던 것들)

부서(department) · 공개 범위(visibility) · 운영 책임자 · 연동 시스템 ·
도구 비용/성과 · 도구 설명 · 월 예상 사용 횟수 · 수요의 사용 중인 시스템 ·
참여 형태 · 평가 7항목 · 개선 요청 담당자 배정

---

# 4부 — 검증 기준

각 단계 끝에서:

```powershell
pnpm lint        # 오류 0, 경고 0
pnpm typecheck   # 통과
pnpm test        # 전부 통과
```

라우팅이나 서버 컴포넌트 경계를 건드렸으면 `pnpm build` 도.

최종 상태 (참고용 — 이 숫자에 맞출 필요는 없습니다):

```
라우트     22개
테스트     275개 (15개 파일)
E2E        3개 시나리오
마이그레이션 16개
```

## 손으로 확인할 것

```powershell
pnpm demo:reset
pnpm dev
```

1. `/login` → 계정 카드 6개. 권한이 서로 다른지 배지로 확인
2. 최관리로 로그인 → `/home` 랜딩이 뜨는가
3. 이검토(REVIEW 권한만)로 로그인 → 관리 탭에 '현황'만 보이는가
4. 주소창에 `/admin/users` 직접 입력 → **404** 인가
5. 박수요(이용자)로 로그인 → `/tools/new` 가 **열리는가** (열려야 정상)
6. 도구 상세 → 탭이 5개인가, 개요 안에 펼쳐보기가 있는가
7. 평가 등록 → 목록에 작성자 이름이 **안 보이는가**
8. 수요 상세 → 문의를 참여 신청 없이 남길 수 있는가
9. 어느 화면에도 `은(는)` 이나 `AM/PM` 이 없는가

---

# 부록 — 정확한 의존성 목록

검증된 조합입니다. 이 버전 그대로 시작하세요.

**Node v24.14.1 / pnpm (npm 전역 설치)**

```jsonc
// dependencies
{
  "@hookform/resolvers": "5.5.7",
  "@supabase/ssr": "0.12.4",
  "@supabase/supabase-js": "2.111.0",
  "class-variance-authority": "0.7.1",
  "clsx": "2.1.1",
  "date-fns": "4.4.0",
  "lucide-react": "1.28.0",
  "next": "16.2.12",
  "radix-ui": "1.6.7",
  "react": "19.2.8",
  "react-dom": "19.2.8",
  "react-hook-form": "7.83.0",
  "server-only": "0.0.1",
  "sonner": "2.0.7",
  "tailwind-merge": "3.6.0",
  "zod": "4.4.3"
}
```

```jsonc
// devDependencies
{
  "@playwright/test": "1.62.0",
  "@tailwindcss/postcss": "4.3.3",
  "@testing-library/react": "16.3.2",
  "@testing-library/user-event": "14.6.1",
  "@types/node": "^24.13.3",
  "@types/react": "^19.2.17",
  "@types/react-dom": "^19.2.3",
  "@vitejs/plugin-react": "6.0.4",
  "eslint": "9.39.5",          // ← 10.x 로 올리지 말 것
  "eslint-config-next": "16.2.12",
  "jsdom": "30.0.1",
  "prettier": "3.9.6",
  "tailwindcss": "4.3.3",
  "typescript": "5.9.3",       // ← 7.x 로 올리지 말 것
  "vitest": "4.1.10"
}
```

```jsonc
// scripts
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "demo:reset": "node scripts/reset-demo.mjs"
}
```

## 환경변수 (`.env.local`)

```ini
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_SESSION_SECRET=change-me-to-a-random-string-at-least-32-chars
# DEMO_DATA_DIR=.data

# NEXT_PUBLIC_DEMO_MODE=false 일 때만 필요
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=
```

## 개발 중 마주칠 함정

**`Jest worker encountered N child process exceptions`**
Next 의 렌더 워커가 메모리를 못 받아 죽은 것입니다. 앱 버그가 아닙니다.
브라우저 새로고침 → 그래도 나면 dev 서버 재시작. 메모리가 8GB 이하면 자주 납니다.

**날짜에 `AM/PM` 이 나옴**
Node 24 의 ICU 가 `ko-KR` + `timeStyle:'short'` 에서 "오전" 대신 "AM" 을 냅니다.
`lib/utils/datetime.ts` 에서 `hour12: false` 로 고정하세요.

**404 를 기대했는데 200 이 나옴**
권한 검사나 `notFound()` 가 `<Suspense>`/`loading.tsx` 경계 안에 있습니다.
응답 헤더가 먼저 나가 상태 코드를 못 바꿉니다.

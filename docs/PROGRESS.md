# 작업 진행 기록

> 단계별로 무엇을 만들고 왜 그렇게 했는지 남긴 기록입니다.
> 전체 개요는 [../README.md](../README.md), 설계 결정은 [DECISIONS.md](DECISIONS.md).

---

## 현재 상태: AI 로드맵 완료 (2026-08-26)

주요 기능 네 가지와 요구사항 네 가지가 모두 실제로 돕니다. 진행 기록은
[ROADMAP-AI.md](ROADMAP-AI.md) 에 있습니다.

```
lint       통과 (오류 0, 경고 0)
typecheck  통과
test       24개 파일 · 392개 테스트 통과
e2e        6개 시나리오 통과 (Chromium)
build      성공 (경고 0, 라우트 25개)
분석       32회 호출 · $1.17 · 실패 0건 (교내 AI 포털)
```

### AI 기능 (2026-08-26)

| 기능 | 어디에 | 모델 |
|---|---|---|
| 중복 자동화 탐지 | 검토 화면 · 도구 상세 | Opus 5 |
| 위험도 자동 평가 | 검토 화면 (체크리스트 위) | Opus 5 |
| 멀티 LLM 품질검증 | 검토 화면 | Opus 5 + Sonnet 5 |
| 수요-도구 자동 매칭 | 수요 상세 | Opus 5 |
| 도구 순위 | `/ranking` | **AI 아님** — 순수 계산 |
| 통합 표준화 | `/admin/consolidation` | **AI 아님** — 중복 판정을 묶는 계산 |

### 모델은 교내 AI 포털을 거칩니다

충남대 AI 포털(`aiportal.cnu.ac.kr`)의 게이트웨이를 씁니다. 모델 회사에 직접
쏘지 않습니다. Anthropic Messages API 를 그대로 중계해 주어 SDK 의 `baseURL` 만
바꿨습니다.

학내 플랫폼에서 이게 중요합니다 — "데이터가 어디로 나가느냐"에 답할 때
**교내 포털을 거친다**는 사실 자체가 답의 일부입니다. 키도 학교가 관리합니다.

**분석은 미리 돌리고 화면은 저장된 것만 읽습니다.** 페이지를 열 때마다 부르면
느리고 비싼 데다, 새로 고칠 때마다 판단이 달라지면 검토 자료로 못 씁니다.
시연 자리에서 키와 망에 기대지 않게 되는 것은 덤입니다.

`.env.local` 에 키를 둡니다 (gitignore 에 있어 커밋되지 않습니다):

```
AI_GATEWAY_API_KEY=<충남대 AI 포털 키>
```

```powershell
pnpm ai:analyze --dry-run   # 부를 횟수와 예상 비용만
pnpm ai:analyze             # 실제 실행 (데모 규모 32회, 약 $1.2)
pnpm demo:reset             # 결과를 데모 데이터에 반영
```

키가 없으면 모든 분석 자리에 "아직 돌리지 않았습니다"가 뜹니다. 숫자를 지어내는
경로는 없습니다.

### 실제로 돌려 보고 잡은 것

셋 다 **돌아가긴 하는데 쓸모가 없는** 상태였습니다. 타입으로도 lint 로도 안 잡히고
값을 봐야 잡힙니다. 그래서 `tests/unit/seeded-analyses.test.ts` 로 지킵니다.

| 증상 | 원인 |
|---|---|
| 중복 탐지가 6건 전부 0건 | `redact.ts` 가 학번 패턴으로 도구 UUID 를 갈아 버려, 모델 답을 "보낸 적 없는 도구"로 보고 전부 버림 |
| 매칭 점수가 1점 | 척도를 프롬프트에 안 적어 모델이 0~1 로 답함 |
| 품질검증이 6건 전부 FAIL | 참고(NOTE) 한 줄에도 탈락시킴. 심각도를 나눠 놓고 판정에 안 씀 |

데모 데이터에도 구멍이 있었습니다. 이 플랫폼의 존재 이유인 "옆 부서가 같은 걸 또
만들고 있다" 사례가 없어 통합 표준화가 텅 비었습니다. 분석을 꾸미는 대신
**실제로 겹치는 도구를 시드에 넣었습니다** — 모델이 NEAR_IDENTICAL 90점으로
잡았고, 글자 겹침은 2.3% 였습니다. 기계적 비교로는 못 잡는 건입니다.

커밋: `69659e2` → `21edb72` → `5491ea6` → `d696e99` → `adcaa79`

---

## 그 전: 리뷰 반영 5단계 완료 (2026-08-25)

2026-08-25 사용자 리뷰([REVIEW-2026-08-25.md](REVIEW-2026-08-25.md))를 반영해
권한 모델부터 신규 기능까지 다시 세웠습니다. 진행 기록은
[PLAN-REDESIGN.md](PLAN-REDESIGN.md) 에 있습니다.

### 리뷰 반영으로 바뀐 것 (2026-08-25)

| | 전 | 후 |
|---|---|---|
| 권한 | 역할 4종(수요자/개발자/검토자/관리자) | 계정 종류 2종 + 관리 권한 6종 + 신분 4종 |
| 부서 | 도구·수요·프로필에 소속 | **삭제**. 실행 방식 + 추천 대상으로 대체 |
| 도구 등록 | 5단계 위저드 | 4단계 (비용·성과 단계 삭제, 연동 삭제) |
| 도구 상세 | 탭 11개 | 탭 5개 (개요 안 펼쳐보기로 통합) |
| 평가 | 7항목 실명 | 종합 1항목 + 주관식, **익명** |
| 첫 화면 | 대시보드 | **랜딩페이지** `/home` |
| 신규 | — | 토큰 · 수요 문의 · 공지게시판 · 회원가입 |

커밋: `6be7cdb` → `5840efd` → `8d2d7d2` → `d0713ab` → `d7d9a7e` → `f9e8468`

### 확인 방법

```powershell
pnpm demo:reset
pnpm dev           # http://localhost:3000
```

손으로 따라가 볼 순서는 [DEMO_SCENARIO.md](DEMO_SCENARIO.md) 에 있습니다.

---

### 1단계: 프로젝트 초기화 ✅

| 파일 | 내용 |
|---|---|
| `package.json` | 스크립트 9종 |
| `tsconfig.json` | strict + `noUncheckedIndexedAccess`, `@/*` → `src/*` |
| `eslint.config.mjs` | flat config + **계층 경계 규칙**(`no-restricted-imports`) |
| `next.config.ts` | 보안 헤더 4종, serverActions 4mb |
| `postcss.config.mjs` | Tailwind v4 (`@tailwindcss/postcss`) |
| `vitest.config.ts` / `tests/setup.ts` | node 환경, 테스트는 항상 DEMO 모드 강제 |
| `playwright.config.ts` | 포트 3100, `workers:1`, 격리 데이터 `.data-e2e` |
| `.env.example` / `.gitignore` / `.prettierrc.json` / `scripts/reset-demo.mjs` | — |

### 2단계: 데이터 계층 + 인증 ✅

**domain 계층** (의존성 0)

```
src/domain/
  shared/{ids,errors,pagination}.ts
  authz/{roles,actions,policies}.ts        ← 권한 단일 진실 원천
  tool/{types,status-machine,risk-checklist-rules}.ts
  demand/{types,status-machine}.ts
  evaluation/{types,scoring}.ts
  improvement/{types,status-machine}.ts
  identity/types.ts  review/types.ts  observability/types.ts
```

- 도구 상태 전환 10종 + 역할 제약 + **CRITICAL 위험도면 PILOT/APPROVED 차단**
- 위험 체크리스트 14항목(요구사항 15번) 전부 정의
- 평가 7항목 1~5점 검증. 베이지안 보정은 3단계용으로 준비만 (호출부 없음)

**저장소 — DEMO / Supabase 양쪽 모두 완료**

```
src/repositories/
  types/index.ts                     ← 9개 인터페이스 (양쪽 구현의 공통 계약)
  demo/    store.ts(뮤텍스+원자적 rename), seed.ts, 9개 구현체
  supabase/ client.ts, mappers.ts, 7개 구현체, index.ts
```

DEMO 데이터: 부서 6 · 계정 6 · 카테고리 6 · 연동시스템 8 · 도구 6 · 수요 4 ·
평가 4 · 개선요청 3 · 위험 체크리스트 2.
**도구명과 수요 제목에 `[예시]` 접두어**를 붙여 가상 데이터임을 표시합니다.

> Supabase 구현은 **실제 프로젝트에 연결해 검증한 적이 없습니다.**
> `src/repositories/supabase/index.ts` 상단 주석에도 같은 경고가 있습니다.

**마이그레이션 12개** (`supabase/migrations/0001~0012`, 실제 DB 미적용)

`tool_status_history` / `audit_logs` / `evaluation_history` / `reward_ledgers` 는
트리거로 수정·삭제를 **DB 차원에서 차단**(append-only).
평가 중복 방지는 부분 유니크 인덱스(`uq_evaluation_user_version`).
`0011_rls_policies.sql` 에 전 테이블 RLS + 헬퍼 함수 7종.

**인증**

```
src/lib/auth/
  session.ts        ← HMAC-SHA256 서명 쿠키 (DEMO). 서명 불일치·만료는 전부 null
  demo-auth.ts      ← isDemoAccount 인 계정으로만 로그인 가능
  supabase-auth.ts  ← @supabase/ssr. getUser() 사용 (getSession() 은 쿠키를 그대로 믿어서 미사용)
  current-user.ts   ← requireUser() / requirePermission() / canProfile()
```

DEMO/Supabase 분기는 `lib/di/container.ts` 와 `lib/auth/current-user.ts` **두 곳에만** 있습니다.

**AI 어댑터** — 6개 서비스 인터페이스 + Noop.
Noop 은 **점수·유사도 숫자를 만드는 코드 경로가 아예 없고** `{ enabled:false, phase }` 만 반환합니다.

**단위 테스트 126개**

| 파일 | 내용 |
|---|---|
| `tests/unit/tool-status-machine.test.ts` | 10개 전환 + 무효 전환 거부 + 역할 제약 + CRITICAL 차단 |
| `tests/unit/demand-status-machine.test.ts` | 수요 전환 + 등록자 권한 |
| `tests/unit/improvement-status-machine.test.ts` | 개선요청 전환 + 담당자/요청자 권한 |
| `tests/unit/policies.test.ts` | 4역할 × 전체 액션 권한 매트릭스 |
| `tests/unit/evaluation-scoring.test.ts` | 1~5 범위·정수·필수 항목, 집계, 삭제 제외 |
| `tests/unit/cn.test.ts` | 유틸 |

### 3단계: 레이아웃 + 디자인 시스템 ✅

```
src/components/
  ui/       button, field(Input/Textarea/NativeSelect/Field), card, badge, alert,
            table, dialog, tabs, checkbox, radio-group, select, tooltip,
            skeleton, empty-state, pagination
  common/   status-badge(도구·수요·개선요청·위험도·데이터분류), phase-notice
  layout/   demo-banner, sidebar, topbar, role-badge, notification-bell
  auth/     demo-login-form, password-login-form
  dashboard/ stat-card, bar-list
src/app/
  (auth)/login/page.tsx
  (app)/layout.tsx  (app)/error.tsx
  (app)/dashboard/{page,loading}.tsx
  not-found.tsx  global-error.tsx
```

UX 요구사항(12번) 반영:
- 모든 상태 배지 = **한국어 라벨 + 고유 아이콘 + 색** 3중 인코딩
- 민감 데이터 분류는 자물쇠 아이콘 + 텍스트 칩
- 대시보드 분포는 차트 라이브러리 없이 CSS 막대 + 숫자 라벨 + `<table>` 마크업
- 빈 상태는 다음 행동 CTA 포함, 로딩은 skeleton, 오류는 내부 정보 비노출
- "본문으로 건너뛰기" 링크, `:focus-visible` 링, `prefers-reduced-motion` 대응

**동작 확인 결과** (프로덕션 빌드 + `curl`):
- `/login` 데모 계정 6개 카드 렌더
- 관리자 로그인 후 대시보드에 지표 8종 + 카테고리/부서 분포 + 최근 활동 8건 표시
- 수요자에게는 `검토 작업`·`관리` 메뉴가 보이지 않음
- 미로그인 / 위조 서명 쿠키 → 둘 다 `/login` 으로 307 리다이렉트

### 4단계: 도구 등록 위저드 ✅

```
src/lib/validation/{common,tool,attachment}.ts
src/application/shared/audit.ts              ← withAudit() · changedFieldNames()
src/application/tools/{register,form-data,attachments}.ts
src/actions/tool-actions.ts
src/lib/auth/page-guard.ts
src/components/tools/wizard/{tool-wizard,shared,step-basic,step-features,
                             step-security,step-cost,step-review,attachment-uploader}.tsx
src/components/common/{string-list-input,unsaved-changes-guard}.tsx
src/app/(app)/tools/new/page.tsx
src/app/(app)/tools/[id]/edit/page.tsx
tests/integration/{helpers.ts,tool-registration.test.ts}   ← 15개
```

설계상 중요한 점:

- **검증 규칙이 한 벌이다.** `toolDraftSchema`(임시저장) 와 `toolSubmitSchema`(신청) 는
  출력 타입이 같고, 클라이언트의 단계별 검사도 같은 스키마 결과에서 해당 단계
  필드만 골라 쓴다. 규칙을 두 곳에서 관리하지 않는다.
- **임시저장은 이름만 있으면 된다.** 작성 도중 저장을 막으면 작업이 날아간다.
- **첨부파일 형식·크기는 서버에서 다시 검사한다.** 브라우저의 `accept` 와
  클라이언트 검사는 실수를 빨리 알려 주기 위한 것일 뿐이다. 허용 목록 방식이며
  SVG 는 스크립트를 품을 수 있어 제외했다.
- **저장 경로에 사용자가 정한 파일명을 쓰지 않는다.** 경로는 `{toolId}/{versionId}/{attachmentId}.{확장자}`
  로만 만든다. 표시용 이름은 별도 컬럼에 둔다.
- **감사 로그에 값이 아니라 필드 이름만 남긴다.** 개인정보가 로그로 새어 나가면 안 된다.
  실패한 시도도 기록한다.
- **권한 없음을 404 로 보여준다** (`page-guard.ts`). "권한이 없습니다"라고 알리면
  그 항목이 존재한다는 사실이 새어 나간다.

### 5단계: 도구 목록 + 상세 ✅

```
src/lib/validation/tool-query.ts             ← URL ↔ 검색 조건
src/application/tools/{query,usage}.ts
src/components/tools/{tool-filters,tool-card,tool-table,
                      tool-detail-tabs,detail-field}.tsx
src/app/(app)/tools/page.tsx                 ← 목록 (Suspense 내장)
src/app/(app)/tools/[id]/page.tsx            ← 상세 11개 탭
tests/integration/tool-query.test.ts         ← 18개
```

설계상 중요한 점:

- **검색 조건이 전부 URL 에 있다.** "승인된 개인정보 처리 도구" 화면을 주소만
  복사해 공유할 수 있고, 뒤로가기·새 탭도 자연스럽게 동작한다. 잘못된 값이
  들어와도 오류 대신 기본값으로 되돌린다 — 주소창은 누구나 고칠 수 있다.
- **공개 범위는 application 계층에서 다시 거른다.** DEMO 저장소에는 RLS 가 없고,
  Supabase 모드에서도 애플리케이션이 1차 방어선이다. 남의 임시저장 도구는
  목록에도 상세에도 나오지 않는다.
- **볼 수 없는 도구는 "없음"으로 처리한다.** 권한 오류를 돌려주면 그 도구가
  존재한다는 사실이 새어 나간다.
- **평가가 없으면 0 점이 아니라 "평가 없음"으로 표시한다.** 비용도 마찬가지로
  0 원과 "파악하지 못함"을 구분한다.
- **`loading.tsx` 를 `tools/` 세그먼트에 두지 않는다.** 하위 경로까지 로딩 경계가
  내려가면 응답 헤더가 먼저 나가서 `/tools/[id]` 의 `notFound()` 가 404 대신 200 을
  반환한다. 실제로 겪은 문제라 목록 페이지 안의 `<Suspense>` 로 바꿨다.

### 6단계: 승인 워크플로 ✅

```
src/lib/validation/review.ts
src/application/shared/notify.ts
src/application/reviews/{workflow,query}.ts
src/actions/review-actions.ts
src/components/reviews/{risk-checklist-form,review-actions-panel}.tsx
src/components/tools/status-transition-dialog.tsx
src/app/(app)/reviews/page.tsx          ← 검토 큐
src/app/(app)/reviews/[id]/page.tsx     ← 검토 화면
tests/integration/review-workflow.test.ts  ← 14개
```

설계상 중요한 점:

- **상태 전환의 최종 판단은 항상 도메인 상태머신**이 한다. 화면에 보이는 버튼
  목록도 `availableTransitions()` 가 계산한 것이며, 화면이 스스로 판단하지 않는다.
- **위험 체크리스트 14항목은 사람이 직접 판단한다.** 화면에 "참고용 제안 등급"이
  보이지만 이는 체크된 항목 수를 세는 단순 규칙이고, 화면에도 "AI 분석 결과가
  아니다"라고 명시했다. 저장되는 값은 검토자가 고른 등급이다.
- **CRITICAL 로 확정하면 PILOT·APPROVED 전환이 서버에서 막힌다.** 체크리스트가
  아예 없어도 막힌다.
- **해당된다고 표시한 항목에는 통제 방안 입력을 강제한다.** 체크만 하고 넘어가면
  나중에 무엇을 확인했는지 알 수 없다.
- **알림 본문에 사유 원문을 담지 않는다.** 알림은 목록에 오래 남으므로 "무슨 일이
  있었는지"와 링크만 넣고, 자세한 내용은 따라가서 보게 한다.
- 검토자는 **자기 자신에게만** 배정할 수 있다. 남에게 배정하는 것은 관리자만 한다.

### 7단계: 수요 등록 + 수동 매칭 ✅

```
src/lib/validation/demand.ts
src/application/demands/{register,match,query}.ts
src/actions/demand-actions.ts
src/components/demands/{demand-form,demand-filters,
                        match-tool-dialog,demand-actions-panel}.tsx
src/app/(app)/demands/{page,new/page,[id]/page,[id]/edit/page}.tsx
tests/integration/demand-matching.test.ts   ← 20개
```

설계상 중요한 점:

- **매칭은 자동 추천이 아니다.** 검토자가 목록에서 도구를 직접 고르고, 연결 유형
  5종 중 하나를 선택하고, 왜 그렇게 판단했는지 10자 이상 적는다. 유사도 점수 같은
  값을 만들거나 보여주지 않는다. 자동 추천은 2단계 몫이라고 화면에도 명시했다.
- **연결은 관리자·검토자만 한다** (요구사항 8번). 개발자와 수요자는 버튼이 보이지 않고,
  직접 요청을 보내도 서버가 막는다.
- **수요는 검토를 거치지 않는다.** 등록자가 직접 공개하고 종료한다. 수요는
  "이런 게 필요합니다"라는 요청이지 승인 대상이 아니다. 다만 개발 단계 전환은
  검토자·관리자 몫이다.
- **개발이 시작된 수요는 내용을 못 바꾼다.** 개발자가 보고 착수한 내용과
  달라지기 때문이다.
- **수요 폼은 위저드로 나누지 않았다.** 항목이 적어 여러 화면으로 쪼개면 오히려
  쓰기 번거로워진다. 검증 규칙은 도구와 마찬가지로 서버와 같은 Zod 스키마를 쓴다.
- 목록의 공개 범위 필터링은 **페이지 자르기보다 먼저** 한다. 그래야 총 건수가 맞는다.

### 8단계: 평가 + 개선 요청 ✅

```
src/lib/validation/{evaluation,improvement}.ts
src/application/evaluations/submit.ts
src/application/improvements/{workflow,query}.ts
src/actions/{evaluation-actions,improvement-actions}.ts
src/components/evaluations/evaluation-form.tsx
src/components/improvements/{improvement-form,improvement-filters,
                             improvement-actions-panel}.tsx
src/app/(app)/improvements/{page,[id]/page}.tsx
tests/integration/evaluation-improvement.test.ts   ← 18개
```

설계상 중요한 점:

- **평가는 버전에 붙는다.** 새 버전이 나오면 다시 평가할 수 있다.
- **같은 사용자·같은 버전 중복 평가를 3중으로 막는다.** 서비스 계층의 사전 확인,
  DEMO 저장소의 저장 직전 재확인, Supabase 의 부분 유니크 인덱스. 저장소가
  던지는 `DUPLICATE_EVALUATION` 을 사용자가 알아들을 메시지로 바꿔 준다.
- **평가는 시범운영·정식 승인 상태에서만** 가능하다 (요구사항 9번).
- **수정하면 이전 값이 이력에 남는다.** 이력을 먼저 쓰고 본문을 갱신한다 —
  갱신은 됐는데 이력이 빠지는 상황을 피한다. 이력 테이블은 append-only 다.
- **점수는 숫자 + 텍스트 라벨을 함께 보여준다.** 별 모양이나 색만으로 의미를
  전달하지 않는다 (요구사항 12번).
- **평가·개선 요청 버튼은 탭 안이 아니라 상단에 둔다.** radix Tabs 는 비활성 탭을
  언마운트하므로 탭을 열어야만 보이고, 그러면 "이 도구 어땠나요"를 물을 기회를 놓친다.
- **감사 로그에 점수와 의견 내용을 담지 않는다.** 평가에는 사람에 대한 판단이
  섞일 수 있어 "등록/수정했다"는 사실만 남긴다.

### 9단계: 관리자 대시보드 + 운영 화면 ✅

```
src/lib/validation/admin.ts
src/application/admin/{manage,audit}.ts
src/actions/admin-actions.ts
src/components/admin/{admin-nav,user-row-actions,department-editor,
                      category-editor,audit-filters}.tsx
src/app/(app)/admin/{layout,page,users/page,departments/page,
                     categories/page,audit-logs/page}.tsx
tests/integration/admin.test.ts   ← 20개
```

설계상 중요한 점:

- **자기 역할은 스스로 바꿀 수 없다.** 관리자가 실수로 자기 권한을 낮추는 것과,
  권한 상승을 혼자 처리하는 것을 함께 막는다. Supabase RLS 의
  `user_roles_admin_write` 정책도 같은 조건(`user_id <> auth.uid()`)을 건다.
- **자기 계정은 비활성화할 수 없다.** 즉시 로그아웃되어 되돌릴 수 없다.
- **"마지막 관리자 보호" 검사는 일부러 넣지 않았다.** 처음엔 넣었다가 뺐다 —
  이 함수를 부르려면 행위자가 관리자여야 하고 자기 역할은 못 바꾸므로 어떤
  경우에도 행위자가 관리자로 남는다. 검사가 있으면 오히려 비활성 관리자를
  정리하는 정상 작업까지 막혔다.
- **역할 변경은 사유 입력이 필수**이고, 사유가 감사 로그에 그대로 남는다.
  권한을 바꾸는 일이라 "왜 바꿨는지"를 나중에 확인할 수 있어야 한다.
- **소속 인원이나 도구가 있는 부서는 삭제할 수 없다.** 지우면 그들의 소속이 사라진다.
- 감사 로그 필터 후보는 **전체 로그에서** 뽑는다. 현재 페이지에서 뽑으면
  필터를 걸수록 후보가 줄어드는 이상한 화면이 된다.

---

### 10단계: E2E + 문서화 ✅

```
e2e/{helpers.ts,full-workflow.spec.ts}
docs/{ARCHITECTURE,DATA_MODEL,SECURITY,SETUP,WORKFLOW,
      OVERVIEW,ROADMAP-AI,TESTING,DEMO_SCENARIO,DECISIONS}.md
README.md  CLAUDE.md
```

Playwright Chromium 을 실제로 설치하고 요구사항 19번의 8단계 시나리오를
하나의 테스트로 이어 붙여 통과시켰습니다. 두 번째 시나리오는 권한 우회 시도가
404 로 막히는지 확인합니다.

E2E 를 만들며 실제로 고친 것:

- 평가 점수 라디오의 접근성 이름이 "4우수"로 붙어 읽혔습니다.
  `aria-label="4점 우수"` 를 추가했습니다.
- 사이드바 이동 후 기다리지 않으면 대시보드의 "최근 활동" 링크를 잘못 잡았습니다.
  헬퍼에서 이동 완료를 기다리고 본문 영역으로 범위를 좁혔습니다.

---

## 남은 작업 (2·3단계)

1단계 MVP 범위는 모두 끝났습니다. 다음 단계 계획은
[ROADMAP-AI.md](ROADMAP-AI.md) 를 보세요.

Supabase 로 전환할 때 반드시 할 일은 [SECURITY.md](SECURITY.md) 의
RLS 검증 체크리스트에 있습니다.

---

## 되돌리면 안 되는 결정들

| 결정 | 이유 |
|---|---|
| **ESLint 9.39.5 고정 (10.x 아님)** | ESLint 10 은 `context.getFilename()` 을 제거했는데 `eslint-plugin-react@7.37.5`(eslint-config-next 의존)가 이를 호출해 **lint 가 전면 실패**합니다. 실제로 겪고 내린 결정입니다. |
| **TypeScript 5.9.3 고정 (7.x 아님)** | TS 7은 네이티브 포팅 릴리스라 `typescript-eslint@8` 호환 리스크. 5.9는 Next 16·vitest 검증 조합. |
| **pnpm 은 npm 전역 설치** | `corepack enable` 이 `C:\Program Files\nodejs` 쓰기 권한 없어 EPERM 실패. |
| **shadcn CLI 미사용** | `radix-ui` 통합 패키지 + CVA 로 `src/components/ui/` 에 직접 vendoring. |
| **차트 라이브러리 없음** | CSS 막대 + 숫자 라벨 + 표. "색만으로 구분 금지" 요구와 일치. |
| **Tailwind v4 CSS-first** | `tailwind.config.js` 를 만들지 마세요. `globals.css` 의 `@theme` 이 토큰 정의 위치입니다. |
| **`store.ts` 의 `turbopackIgnore` 주석** | 없으면 Turbopack 이 프로젝트 전체를 추적해 빌드 경고를 냅니다. |
| **vitest 의 `server-only` 별칭** | 이 패키지는 Next.js 밖에서 import 하면 무조건 예외를 던집니다. 테스트에서는 `tests/stubs/server-only.ts` 로 대체합니다. 서버 전용 경계의 실제 검사는 `pnpm build` 가 계속 담당합니다. |
| **통합 테스트는 application 서비스를 직접 호출** | 서버 액션은 `next/headers` 에 의존해 vitest 에서 돌지 않습니다. 실제 규칙은 전부 application 계층에 있으므로 검증 범위는 줄지 않습니다. |
| **`app/(app)/tools/` 에 `loading.tsx` 를 만들지 말 것** | 하위 경로까지 로딩 경계가 내려가 응답 헤더가 먼저 나가고, `/tools/[id]` 의 `notFound()` 가 404 대신 200 을 반환합니다. 목록 페이지 안의 `<Suspense>` 를 쓰세요. |
| **`.data/` 는 커밋 금지** | DEMO 로컬 데이터. `pnpm demo:reset` 으로 초기화. |
| **모델에 보내는 것은 `redact.ts` 만 거친다** | 허용 목록 방식입니다. 도메인 타입에 필드가 생겨도 여기 적지 않으면 새지 않습니다. 다른 경로로 payload 를 만들지 마세요 — 학내 플랫폼에서 "개인정보가 외부로 가지 않느냐"에 코드로 답할 수 있어야 합니다. |
| **분석은 스크립트가 돌리고 앱은 읽기만 한다** | 서버 액션이나 페이지에서 `analyze*` 를 부르지 마세요. 느리고 비싸고, 새로 고칠 때마다 판단이 달라지면 검토 자료로 못 씁니다. |
| **`seed-analyses.ts` 를 손으로 고치지 말 것** | `pnpm ai:analyze` 가 통째로 덮어씁니다. |
| **AI 제안으로 체크박스를 자동으로 채우지 말 것** | 채워 두면 검토자가 그대로 넘깁니다. 그러면 검토가 없는 것과 같습니다. |

---

## 참고 문서

- 전체 계획: `C:\Users\사용자\.claude\plans\gleaming-zooming-salamander.md`
- 저장소 인터페이스: `src/repositories/types/index.ts`
- 권한 규칙: `src/domain/authz/policies.ts`
- DB 스키마: `supabase/migrations/`

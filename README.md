# 캠퍼스 자동화 관제 플랫폼

대학 내 여러 부서·개인이 각자 만든 AI 서비스와 업무 자동화 도구를 한곳에 모아
**등록 · 검토 · 평가 · 개선**하는 플랫폼입니다.

해결하려는 문제:

- 같은 도구를 여러 부서가 따로 만드는 **중복 개발**
- 개인정보·학사정보를 다루는 도구가 검토 없이 쓰이는 **위험**
- 비용과 유지보수 상태를 아무도 모르는 **관리 공백**
- 자동화가 필요한 업무와 이미 있는 도구가 만나지 못하는 **매칭 실패**

## 지금 상태

**1단계 MVP 완료.** DEMO 모드로 바로 실행해 볼 수 있습니다.

```
lint       통과
typecheck  통과
test       231개 통과 (단위 + 통합)
e2e        2개 시나리오 통과 (Chromium)
build      통과
```

AI 중복 탐지·위험 자동평가·멀티 LLM 검증·순위·토큰은 **2·3단계**입니다.
지금은 인터페이스와 빈 어댑터, 예약 테이블만 있습니다
(→ [docs/AI_ROADMAP.md](docs/AI_ROADMAP.md)).

## 빠른 시작

```powershell
pnpm install
copy .env.example .env.local
pnpm dev
```

http://localhost:3000 → `/login` 에서 데모 계정 카드를 고르면 로그인됩니다.
비밀번호는 없습니다.

> 화면의 모든 기관·부서·사용자·도구 정보는 **가상의 예시 데이터**입니다.
> 상단에 DEMO 배너가 항상 뜨고, 도구명에는 `[예시]` 접두어가 붙습니다.

전체 흐름을 눌러 보려면 → [docs/DEMO_SCENARIO.md](docs/DEMO_SCENARIO.md)

## 기능

### 도구 등록과 승인

- 5단계 위저드 (임시저장·단계 검증·이탈 경고)
- 상태 9종 · 전환 10종 · 역할 제약
- 검토자 배정, 위험 체크리스트 14항목, 검토 의견
- **위험도가 CRITICAL 이면 시범운영·정식 승인이 서버에서 막힙니다**
- 버전 관리, 첨부파일(허용 목록 10종 · 10MB)

### 수요와 매칭

- 업무 수요 등록 (임시저장 → 공개)
- **수동** 도구 연결 — 검토자가 직접 고르고 유형 5종 중 선택, 사유 필수
- 개발 참여 신청

### 평가와 개선

- 7항목 1~5점 평가. 버전별, 중복 방지, 수정 이력
- 개선 요청 등록 · 담당자 배정 · 처리 흐름 · 이력

### 운영

- 역할별 대시보드
- 관리자: 사용자 역할, 부서, 카테고리, **감사 로그**

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript 5.9 strict ·
Tailwind CSS v4 (CSS-first) · radix-ui + CVA · Zod 4 · React Hook Form ·
Supabase (supabase-js + ssr) · Vitest 4 · Playwright 1.62 · pnpm

버전 고정 이유는 [docs/DECISIONS.md](docs/DECISIONS.md) 를 보세요.

## 이중 모드

같은 저장소 인터페이스를 두 구현이 만족합니다. 분기는 두 파일에만 있습니다.

| | DEMO (기본) | Supabase |
|---|---|---|
| 저장소 | `.data/demo-db.json` | PostgreSQL |
| 인증 | HMAC 서명 쿠키 | `@supabase/ssr` |
| 첨부 | 로컬 파일 | Storage (서명 URL) |
| 권한 | domain 정책 | domain 정책 + RLS |

전환 방법 → [docs/SETUP.md](docs/SETUP.md)

> ⚠️ Supabase 경로는 **실제 프로젝트로 검증된 적이 없습니다.**
> 처음 연결할 때 [docs/SECURITY.md](docs/SECURITY.md) 의 RLS 검증 체크리스트를
> 반드시 수행해 주세요.

## 명령어

```powershell
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint (계층 경계 규칙 포함)
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest
pnpm test:e2e     # Playwright
pnpm demo:reset   # DEMO 데이터 초기화
```

## 문서

| 문서 | 내용 |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 계층 구조, 이중 모드, 서버 액션 파이프라인 |
| [DATA_MODEL.md](docs/DATA_MODEL.md) | 테이블, 삭제 정책, 마이그레이션 |
| [WORKFLOW.md](docs/WORKFLOW.md) | 역할별 권한, 상태 전환표 |
| [SECURITY.md](docs/SECURITY.md) | 요구사항 18번 대조표, RLS 검증 체크리스트 |
| [SETUP.md](docs/SETUP.md) | 설치, Supabase 전환 |
| [TESTING.md](docs/TESTING.md) | 테스트 구조와 범위 |
| [DEMO_SCENARIO.md](docs/DEMO_SCENARIO.md) | 손으로 확인하는 순서 |
| [AI_ROADMAP.md](docs/AI_ROADMAP.md) | 2·3단계 계획과 붙일 때 주의점 |
| [DECISIONS.md](docs/DECISIONS.md) | 설계 결정 기록 |
| [PROGRESS.md](docs/PROGRESS.md) | 단계별 진행 기록 |

## 설계 원칙

**가짜 AI 결과를 만들지 않습니다.** Noop 어댑터에는 점수를 만드는 코드 경로가
아예 없고, 화면은 "2단계에서 제공될 예정" 안내만 렌더합니다. 자리표시용 숫자나
흐린 그래프를 그리지 않습니다.

**권한은 서버에서 검사합니다.** 화면에서 버튼을 감추는 것은 편의이고, 실제
차단은 서버 액션과 페이지 로더가 합니다. E2E 가 주소 직접 입력을 시도해
404 가 돌아오는지 확인합니다.

**감사 로그에 값이 아니라 필드 이름만 남깁니다.** 개인정보가 로그로 새어 나가면
안 됩니다. 관리자 작업도 예외 없이 기록됩니다.

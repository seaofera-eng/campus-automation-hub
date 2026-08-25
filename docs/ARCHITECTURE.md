# 아키텍처

## 계층 구조

의존 방향은 한 방향만 허용합니다. 반대 방향 import 는 ESLint `no-restricted-imports`
규칙이 빌드 전에 차단합니다 (`eslint.config.mjs` 의 `layerBoundaries`).

```
app / components      화면. React Server/Client Component
        ↓
actions               "use server" 진입점. 검증 → 권한 → 서비스 호출 → 감사 로그
        ↓
application           use case 서비스. 여러 저장소를 묶고 알림·감사 로그를 붙인다
        ↓
domain                순수 로직. 타입, 상태머신, 권한 정책, 점수 규칙. 의존성 0
        ↑
repositories          인터페이스 + DEMO 구현 + Supabase 구현
adapters/ai           2·3단계 서비스 인터페이스 + Noop 구현
lib/*                 auth, validation(Zod), di, config, utils
```

### 각 계층이 지키는 것

| 계층 | 할 수 있는 것 | 할 수 없는 것 |
|---|---|---|
| `domain` | 타입 정의, 상태 전환 판단, 권한 판단, 점수 계산 | 다른 어떤 것도 import 하지 않음. React·Next 도 안 됨 |
| `application` | 저장소 조합, 트랜잭션 순서 결정, 알림, 감사 로그 | UI 를 알지 못함. React 사용 금지 |
| `repositories` | 저장·조회 | application 이상을 참조할 수 없음 |
| `actions` | 세션 확인, Zod 검증, 서비스 호출, revalidate | 비즈니스 규칙을 직접 구현하지 않음 |
| `components`/`app` | 화면 렌더 | **저장소를 직접 호출할 수 없음** |

UI 가 저장소를 직접 부르지 못하게 막는 이유는 권한 검사와 감사 로그를 우회할 수
없게 하기 위해서입니다.

## 이중 모드

DEMO 모드와 Supabase 모드는 **같은 저장소 인터페이스**(`src/repositories/types/index.ts`)를
구현합니다. 어느 쪽이 주입되는지는 application 계층과 UI 가 알지 못합니다.

분기는 **두 곳에만** 있습니다.

- `src/lib/di/container.ts` — 어떤 저장소 구현을 쓸지
- `src/lib/auth/current-user.ts` — 어떤 인증 방식을 쓸지

| | DEMO 모드 (기본) | Supabase 모드 |
|---|---|---|
| 저장소 | `.data/demo-db.json` 파일 | Supabase PostgreSQL |
| 인증 | HMAC-SHA256 서명 쿠키 | `@supabase/ssr` 쿠키 세션 |
| 첨부 | `.data/uploads/` | Supabase Storage (서명 URL) |
| 권한 | domain 정책 함수 | domain 정책 함수 + RLS 이중 방어 |
| 표시 | 상단 DEMO 배너 상시 노출 | 배너 없음 |

## 서버 액션 파이프라인

모든 서버 액션이 같은 순서를 지킵니다.

```ts
export async function submitToolAction(input: unknown) {
  return run(async () => {
    const actor = await requireUser();                 // 1) 세션
    const data = parseOrThrow(submitToolSchema, input); // 2) Zod 검증
    return withAudit(actor, { ... }, () =>              // 4) 감사 로그
      submitTool(actor, data));                         // 3) 권한은 서비스 안에서 assertCan()
  });
}
```

`run()` 이 예외를 `ActionResult` 로 바꿉니다. `DomainError` 는 사용자에게 보여줄 수
있게 만든 메시지라 그대로 전달하고, 그 외 예외는 내부 구조가 새어 나가지 않도록
일반 메시지로 바꾼 뒤 원본은 서버 로그에만 남깁니다.

## 상태머신

도구·수요·개선요청 각각이 전환 표를 갖습니다. 이 표가 **서버 측 단일 진실 원천**입니다.

- 화면의 버튼 목록도 `availableTransitions()` 가 계산한 결과입니다. 화면이 스스로
  판단하지 않습니다.
- 주소를 직접 입력하거나 요청을 조작해도 `assertTransitionAllowed()` 가 막습니다.
- 도구는 위험도가 `CRITICAL` 이거나 체크리스트가 없으면 `PILOT`·`APPROVED` 로 갈 수
  없습니다 (요구사항 15번).

## 폴더

```
src/
  app/
    (auth)/login/            로그인
    (app)/                   로그인 후 공통 껍데기 (사이드바·상단바·DEMO 배너)
      dashboard/  tools/  demands/  reviews/  improvements/  admin/
    api/health/              E2E 준비 확인용
  components/
    ui/                      버튼·필드·카드 등 프리미티브 (radix + CVA 직접 vendoring)
    common/                  상태 배지, 단계 안내, 목록 입력, 이탈 경고
    layout/                  사이드바, 상단바, DEMO 배너, 역할 배지, 알림
    tools/  demands/  reviews/  improvements/  evaluations/  admin/  dashboard/
  domain/                    의존성 0
  application/               use case 서비스
  repositories/              types + demo + supabase
  adapters/ai/               2·3단계 인터페이스 + Noop
  lib/                       auth, validation, di, config, actions, utils
  actions/                   "use server"
supabase/migrations/         0001~0012
tests/{unit,integration}/    Vitest
e2e/                         Playwright
```

## 왜 이렇게 했는지

**저장소 인터페이스를 먼저 정한 이유** — DEMO 모드로 먼저 만들되 Supabase 전환이
"설정만 바꾸면 되는" 상태가 되어야 했습니다. 인터페이스가 있어야 두 구현이
같은 계약을 지킨다는 것을 타입으로 보장할 수 있습니다.

**domain 을 의존성 0 으로 둔 이유** — 상태 전환과 권한은 이 시스템에서 가장
바뀌면 안 되는 규칙입니다. 프레임워크나 저장소에 딸려 있으면 테스트하기 어렵고,
"화면에서 이렇게 하니까"라는 이유로 규칙이 흔들립니다.

**검증 스키마를 서버와 클라이언트가 공유하는 이유** — 규칙을 두 벌 관리하면
반드시 어긋납니다. 클라이언트 검증은 어느 칸이 문제인지 빨리 알려 주기 위한
편의이고, 실제 차단은 항상 서버가 합니다.

# 이 저장소에서 작업할 때

## 먼저 읽을 것

- `docs/PROGRESS.md` — 지금 어디까지 되어 있는지
- `docs/DECISIONS.md` — **되돌리기 전에 읽어야 할 결정들**
- `docs/ARCHITECTURE.md` — 계층 구조
- `docs/PLAN-REDESIGN.md` — 2026-08-25 리뷰 반영 계획과 진행 상황

## 명령어

```powershell
pnpm dev / build / start
pnpm lint / typecheck / test / test:e2e
pnpm demo:reset
```

변경 후에는 **`pnpm lint`, `pnpm typecheck`, `pnpm test` 를 모두** 돌려 주세요.
빌드까지 확인해야 하는 변경(라우팅, 서버 컴포넌트 경계)이면 `pnpm build` 도.

## 절대 하지 말 것

### 의존성

- **ESLint 를 10.x 로 올리지 마세요.** `eslint-plugin-react` 가 제거된 API 를
  호출해 lint 가 전면 실패합니다.
- **TypeScript 를 7.x 로 올리지 마세요.** `typescript-eslint@8` 호환 리스크.
- **`tailwind.config.js` 를 만들지 마세요.** v4 CSS-first 입니다. 토큰은
  `src/app/globals.css` 의 `@theme` 에 있습니다.
- `corepack enable` 을 시도하지 마세요. 이 환경에서 EPERM 으로 실패합니다.

### 구조

- **`src/domain/` 에서 무엇도 import 하지 마세요.** 의존성 0 을 유지합니다.
- **UI 에서 `@/repositories/*` 를 import 하지 마세요.** 권한 검사와 감사 로그를
  우회하게 됩니다. application 서비스나 서버 액션을 경유하세요.
- ESLint 가 위 둘을 강제합니다. 규칙을 끄지 마세요.

### 라우팅

- **`src/app/(app)/tools/` 에 `loading.tsx` 를 만들지 마세요.** 하위 경로까지
  로딩 경계가 내려가 `notFound()` 가 404 대신 200 을 반환합니다.
  로딩 표시가 필요하면 페이지 안에서 `<Suspense>` 를 쓰세요.
- **권한 검사를 `<Suspense>` 안에서 하지 마세요.** 같은 이유로 404 가 200 이 됩니다.
  페이지 본문에서 먼저 `guardPage(() => requirePermission(...))` 을 부르세요.

### 요구사항에서 온 제약

- **가짜 AI 결과를 만들지 마세요.** Noop 어댑터는 `{ enabled: false }` 만
  반환합니다. 점수·유사도 숫자를 만들거나 자리표시용 그래프를 그리지 마세요.
- **데모 데이터에 실제 개인정보를 넣지 마세요.** 이메일은 RFC 2606 예약 도메인
  `demo.university.test` 를 씁니다.
- **감사 로그에 값을 넣지 마세요.** 바뀐 **필드 이름**만 남깁니다.
  (예외: 권한 변경 사유 — 권한 변경의 근거라 남깁니다.)
- **관리자 작업을 감사 로그에서 빼지 마세요.**
- **평가 작성자를 화면에 보여주지 마세요.** 평가는 익명입니다. 저장은 하지만
  (중복 방지·본인 수정) 표시하지 않습니다.
- **한국어 조사를 `은(는)` 처럼 쓰지 마세요.** `domain/shared/josa.ts` 의
  `josa()` 를 쓰면 받침을 보고 골라 줍니다.
- **날짜를 직접 포맷하지 마세요.** `lib/utils/datetime.ts` 를 씁니다.
  `timeStyle` 만 주면 Node 버전에 따라 "오전" 대신 "AM" 이 나옵니다.

## 권한 모델

역할 하나가 아니라 축 셋입니다. `src/domain/authz/accounts.ts` 를 보세요.

- `AccountType` — `USER` / `ADMIN`
- `AdminPermission` — 관리자가 받은 세부 권한 6종. **관리자라고 다 되는 게 아닙니다.**
- `MemberType` — 학내 신분. **권한이 아닙니다.** 추천 대상 표시에만 씁니다.

판단 기준은 둘입니다: **내가 만든 것인가**(소유권), **그 권한을 받았는가**.
이용자끼리는 구분하지 않습니다 — 누구나 수요를 올리고 도구를 만듭니다.

**관리 권한으로 소유권을 넘지 마세요.** 관리자도 남의 도구 내용이나 남이 쓴 평가는
고칠 수 없습니다.

## 새 기능을 붙이는 순서

1. `src/domain/` 에 타입과 규칙을 정의합니다. 여기에 단위 테스트를 붙입니다.
2. `src/repositories/types/index.ts` 에 필요한 저장소 메서드를 추가하고
   **DEMO 와 Supabase 양쪽**을 구현합니다.
3. `src/lib/validation/` 에 Zod 스키마를 만듭니다. 클라이언트도 같은 스키마를 씁니다.
4. `src/application/` 에 서비스를 만듭니다. 여기서 `assertCan()` 을 부릅니다.
5. `src/actions/` 에 얇은 진입점을 만듭니다. `run()` + `parseOrThrow()` + `withAudit()`.
6. 화면을 만듭니다. 페이지 로더는 `guardPage()` 로 감쌉니다.
7. `tests/integration/` 에 통합 테스트를 씁니다.

## 서버 액션 형태

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

## 페이지 로더 형태

```tsx
export default async function SomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await guardPage(() => loadSomething(id));
  // ...
}
```

`guardPage()` 가 `UNAUTHENTICATED` → `/login` 리다이렉트,
`FORBIDDEN`·`NOT_FOUND` → 404 로 바꿔 줍니다.

## 테스트 작성 시

- 통합 테스트는 **application 서비스를 직접** 부릅니다. 서버 액션은
  `next/headers` 의존이라 Vitest 에서 돌지 않습니다.
- `setupIsolatedStore()` / `teardownIsolatedStore()` 로 격리합니다.
- 세션이 필요하면 `vi.mock('@/lib/auth/current-user')` 로 `requireUser` 만
  갈아 끼우고 권한 판단 로직은 진짜를 씁니다.

## 한국어 UI 문구

- 오류 메시지는 **"무엇이 잘못됐는지 + 어떻게 고치는지"** 두 부분으로 씁니다.
- 개발자 용어를 쓰지 않습니다. 화면에 그대로 나가는 문장입니다.
- 상태는 **텍스트 + 아이콘 + 색** 3중으로 표시합니다. 색만으로 구분하지 않습니다.
- 값이 없을 때 0 으로 채우지 않습니다. "평가 없음", "파악하지 못함"으로 구분합니다.

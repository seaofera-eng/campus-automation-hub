# 설치와 실행

## 요구 사항

- Node.js 22 이상
- pnpm 11 이상

pnpm 이 없으면 `npm i -g pnpm` 으로 설치합니다.

> Windows 에서 `corepack enable` 은 `C:\Program Files\nodejs` 쓰기 권한이 없어
> `EPERM` 으로 실패할 수 있습니다. 그럴 때는 위 명령을 쓰세요.

## DEMO 모드로 실행 (기본)

```powershell
pnpm install
copy .env.example .env.local     # 그대로 두면 DEMO 모드로 동작합니다
pnpm dev
```

http://localhost:3000 → `/login` 에서 데모 계정 카드를 고르면 로그인됩니다.
비밀번호는 없습니다.

데모 데이터를 처음부터 다시 만들려면:

```powershell
pnpm demo:reset
```

`.data/` 디렉터리를 지웁니다. 다음 요청에서 시드가 자동으로 다시 만들어집니다.

## 명령어

| 명령 | 내용 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 빌드 결과 실행 |
| `pnpm lint` | ESLint (계층 경계 규칙 포함) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (단위 + 통합) |
| `pnpm test:watch` | Vitest watch |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm format` | Prettier |
| `pnpm demo:reset` | DEMO 데이터 초기화 |

## E2E 테스트

처음 한 번은 브라우저를 받아야 합니다.

```powershell
pnpm exec playwright install chromium
pnpm test:e2e
```

E2E 는 `.data-e2e/` 를 쓰므로 개발용 `.data/` 를 건드리지 않습니다.
`playwright.config.ts` 의 `webServer` 가 자동으로 빌드하고 3100 포트에 띄웁니다.

## Supabase 모드로 전환

> ⚠️ 이 경로는 **실제 Supabase 프로젝트로 검증된 적이 없습니다.**
> `docs/SECURITY.md` 의 RLS 검증 체크리스트를 함께 수행해 주세요.

### 1. 프로젝트 생성

[supabase.com](https://supabase.com) 에서 프로젝트를 만들고 `Project Settings → API`
에서 다음을 확인합니다.

- Project URL
- `anon` public key
- `service_role` key — **절대 클라이언트에 노출하면 안 됩니다**

### 2. 마이그레이션 적용

`supabase/migrations/` 의 SQL 을 **0001 부터 순서대로** 실행합니다.
Supabase CLI 를 쓴다면:

```bash
supabase link --project-ref <프로젝트-ref>
supabase db push
```

SQL Editor 에서 직접 붙여 넣어도 됩니다. 순서를 지켜야 합니다.

### 3. Storage 버킷 생성

첨부파일용 버킷은 SQL 마이그레이션 범위 밖이라 수동으로 만듭니다.

1. `Storage → New bucket`
2. 이름: `tool-attachments`
3. **Public bucket 을 끕니다.** 첨부에 개인정보가 있을 수 있어 링크만 알면
   누구나 여는 상태가 되면 안 됩니다. 코드는 짧은 수명(5분)의 서명 URL 을 씁니다.

### 4. 환경변수

`.env.local` 을 수정합니다.

```dotenv
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_STORAGE_BUCKET=tool-attachments
```

`SUPABASE_SERVICE_ROLE_KEY` 에 **`NEXT_PUBLIC_` 접두어를 붙이면 안 됩니다.**
붙이는 순간 브라우저 번들에 들어가고 RLS 가 무력화됩니다.

### 5. 첫 사용자 만들기

Supabase Auth 로 사용자를 만든 뒤, 그 `auth.users.id` 로 `profiles` 와 `user_roles`
행을 넣어 줍니다.

```sql
insert into profiles (id, campus_id, email, name, role_title, is_demo_account)
values ('<auth.users.id>', '<campus_id>', 'admin@university.ac.kr', '관리자', '팀장', false);

insert into user_roles (user_id, campus_id, role)
values ('<auth.users.id>', '<campus_id>', 'ADMIN');
```

관리자가 한 명 생기면 나머지는 `/admin/users` 화면에서 관리할 수 있습니다.

## 문제 해결

**`pnpm lint` 가 `contextOrFilename.getFilename is not a function` 으로 실패**
ESLint 가 10.x 로 올라간 경우입니다. `eslint-plugin-react@7.37.5` 가 ESLint 10 에서
제거된 API 를 호출합니다. `eslint@9.39.5` 로 되돌리세요.

**DEMO 데이터가 이상하다**
`pnpm demo:reset` 후 다시 실행합니다.

**E2E 가 3100 포트 충돌로 실패**
이전 `pnpm start` 프로세스가 남아 있는 경우입니다. 종료 후 다시 실행하세요.

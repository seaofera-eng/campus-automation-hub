# 테스트

## 현재 상태

```
단위 + 통합   12개 파일 · 231개 테스트 통과
E2E           2개 시나리오 통과 (Chromium)
```

## 구조

| 종류 | 위치 | 환경 |
|---|---|---|
| 단위 | `tests/unit/` | Vitest, node |
| 통합 | `tests/integration/` | Vitest, node + 임시 디렉터리 DEMO 스토어 |
| E2E | `e2e/` | Playwright, Chromium, `.data-e2e/` |

### 단위 테스트

도메인 규칙만 다룹니다. 저장소도 프레임워크도 필요 없습니다.

| 파일 | 검증 대상 |
|---|---|
| `tool-status-machine.test.ts` | 도구 전환 10종, 무효 전환 거부, 역할 제약, **CRITICAL 차단** |
| `demand-status-machine.test.ts` | 수요 전환, 등록자 권한 |
| `improvement-status-machine.test.ts` | 개선요청 전환, 담당자·요청자 권한 |
| `policies.test.ts` | 4역할 × 전체 액션 권한 매트릭스 |
| `evaluation-scoring.test.ts` | 1~5 범위·정수·필수 항목, 집계, 삭제 제외, 베이지안 보정 |
| `cn.test.ts` | 클래스 병합 유틸 |

### 통합 테스트

application 서비스를 직접 부릅니다. 각 테스트 파일이 **임시 디렉터리에 자기만의
DEMO 저장소**를 가지므로 개발용 `.data/` 를 건드리지 않고 테스트끼리도 간섭하지
않습니다 (`tests/integration/helpers.ts`).

| 파일 | 검증 대상 |
|---|---|
| `tool-registration.test.ts` | 임시저장, 이어쓰기, 신청, 중복 이름, 권한, 신청 검증 규칙 |
| `tool-query.test.ts` | 공개 범위 필터링, 상세 조회, 정렬, URL 검색 조건 왕복 |
| `review-workflow.test.ts` | 배정, 보완 요청, 재신청, 체크리스트, 승인, 알림 |
| `demand-matching.test.ts` | 수요 등록, 상태 전환, 수동 매칭, 개발 참여 |
| `evaluation-improvement.test.ts` | 평가·중복 방지·수정 이력, 개선요청 처리 흐름, 배정 |
| `admin.test.ts` | 접근 제어, 역할 변경, 부서·카테고리 관리, 감사 로그 |

**서버 액션을 직접 테스트하지 않는 이유**: 액션은 `next/headers` 에 의존해
Vitest 에서 동작하지 않습니다. 실제 규칙은 전부 application 계층에 있으므로
검증 범위는 줄지 않습니다. 액션의 얇은 껍데기(검증 → 서비스 호출 → revalidate)는
E2E 가 덮습니다.

### E2E 테스트

`e2e/full-workflow.spec.ts` 가 요구사항 19번의 8단계 시나리오를 하나로 잇습니다.

1. 개발자 로그인 → DEMO 배너 확인
2. 5단계 위저드로 도구 등록 → 임시저장 → 등록 신청
3. 검토자 배정 → **체크리스트 없이는 시범운영 버튼이 없음을 확인** → 보완 요청
4. 개발자 수정 → 보완 후 재신청
5. 검토자 검토 재시작 → 체크리스트 작성 → 시범운영 승인
6. 수요자 평가 (7항목) → 평균 표시 확인
7. 수요자 개선 요청 → 접수 상태 확인
8. 관리자 대시보드 → 감사 로그에서 7종 작업 기록 확인

두 번째 시나리오는 **권한 우회 시도**를 확인합니다. 수요자로 로그인해
`/reviews`, `/admin`, `/admin/users`, `/tools/new` 주소를 직접 열면 모두 404 입니다.

## 실행

```powershell
pnpm test                              # 단위 + 통합
pnpm test:watch                        # watch
pnpm exec playwright install chromium  # 처음 한 번
pnpm test:e2e                          # E2E
```

## 테스트 환경의 두 가지 우회

**`server-only` 별칭** (`vitest.config.ts`)
이 패키지는 Next.js 밖에서 import 하면 무조건 예외를 던집니다. 테스트에서는
`tests/stubs/server-only.ts` 로 바꿔치기합니다. 서버 전용 경계의 실제 검사는
`pnpm build` 가 계속 담당하므로 보호가 약해지지 않습니다.

**세션 모킹** (`tool-query.test.ts`, `admin.test.ts`)
`requireUser()` 는 쿠키를 읽습니다. 테스트에서는 "지금 로그인한 사람"만 갈아
끼우고 권한 판단 로직(`toActor`, `assertCan`)은 진짜를 그대로 씁니다.

## E2E 를 만들며 실제로 잡은 것

E2E 는 테스트 자체보다 **UI 의 접근성 문제**를 드러냈습니다.

- 평가 점수 라디오가 `sr-only` 인데 숫자와 라벨이 별개의 `<span>` 이라
  접근성 이름이 "4우수"로 붙어 읽혔습니다. `aria-label="4점 우수"` 를 추가했습니다.
- 사이드바 이동 후 기다리지 않으면 대시보드의 "최근 활동" 링크를 잘못 잡았습니다.
  실제 사용자에게도 같은 이름의 링크가 여러 곳에 있다는 뜻이라, 헬퍼에서
  본문 영역으로 범위를 좁혔습니다.

## 아직 덮지 않은 것

- **Supabase 저장소 구현** — 실제 DB 없이는 테스트할 수 없습니다.
  `docs/SECURITY.md` 의 RLS 검증 체크리스트가 이 자리를 대신합니다.
- **파일 업로드 실제 동작** — E2E 에서 첨부 영역이 열리는 것까지만 확인하고
  실제 파일을 올리지는 않습니다.
- **동시성** — DEMO 스토어의 뮤텍스는 설계로 보장하되 테스트는 없습니다.
- **접근성 자동 검사** — axe 같은 도구를 붙이지 않았습니다. 수동으로 키보드
  이동과 스크린리더 라벨을 확인했습니다.

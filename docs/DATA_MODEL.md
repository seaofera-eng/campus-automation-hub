# 데이터 모델

TypeScript 타입(`src/domain/**/types.ts`)이 **단일 진실 원천**입니다.
Supabase 행은 `src/repositories/supabase/mappers.ts` 에서 도메인 타입으로 바뀌고,
DEMO 저장소는 도메인 타입을 그대로 JSON 으로 저장합니다.

## 공통 규칙

- 식별자는 `uuid`. 코드에서는 **브랜드 타입**(`ToolId`, `UserId` …)이라 서로 섞이면
  컴파일이 실패합니다.
- 공통 컬럼: `created_at`, `updated_at`, `created_by`, `campus_id`(멀티캠퍼스 대비)

### 삭제 정책

| 정책 | 테이블 |
|---|---|
| **소프트 삭제** (`deleted_at`) | `automation_tools`, `automation_tool_versions`, `automation_demands`, `tool_evaluations`, `improvement_requests`, `departments`, `profiles` |
| **하드 삭제 허용** | `tool_tag_relations`, `tool_integrations`, `demand_matches`, `notifications` |
| **삭제 금지 (append-only)** | `tool_status_history`, `evaluation_history`, `improvement_request_history`, `audit_logs`, `usage_events` |

append-only 테이블은 Postgres 트리거(`reject_mutation()`)가 `UPDATE`·`DELETE` 를
**DB 차원에서 거부**합니다. 애플리케이션 버그로도 이력을 고칠 수 없습니다.

## 핵심 설계

### 버전 중심 모델

`automation_tools` 는 자주 바뀌지 않는 것(이름, 소유 부서, 상태)만 갖고,
상세 내용은 `automation_tool_versions` 에 붙습니다.

평가도 버전에 붙습니다. 그래서 **새 버전이 나오면 다시 평가받을 수 있고**,
"어느 버전에 대한 평가인지"가 분명합니다.

### 중복 평가 방지

요구사항 9번("같은 사용자·같은 버전 중복 평가 금지")을 세 겹으로 막습니다.

1. `submitEvaluation()` 의 사전 확인 — 사용자에게 알아들을 메시지를 준다
2. DEMO 저장소의 저장 직전 재확인 — 동시 요청 대비
3. `uq_evaluation_user_version` 부분 유니크 인덱스 — 최종 방어선

```sql
create unique index uq_evaluation_user_version
  on tool_evaluations (evaluator_user_id, tool_version_id)
  where deleted_at is null;
```

`where deleted_at is null` 이 붙어 있어 삭제된 평가는 제약에 걸리지 않습니다.

### 데이터 분류를 행으로 저장하는 이유

`tool_data_classifications` 는 `(classification, in_use, note)` 행 구조입니다.
불리언 컬럼 8개로 두지 않은 것은 **분류가 늘어날 때 스키마를 바꾸지 않기** 위해서고,
2단계 위험 평가가 이 행들을 그대로 입력으로 쓸 수 있게 하기 위해서입니다.

### 상태 이력을 트리거가 아니라 서비스에서 남기는 이유

`tool_status_history` 는 애플리케이션이 상태 변경과 같은 흐름에서 기록합니다.
트리거로 하면 DEMO 모드에서 같은 코드 경로를 쓸 수 없습니다.

## 마이그레이션

| 파일 | 내용 |
|---|---|
| `0001_extensions_and_enums.sql` | `pgcrypto`, enum 16종, `set_updated_at()` |
| `0002_org_and_identity.sql` | `campuses`, `departments`, `profiles`, `user_roles` + RLS 헬퍼 함수 |
| `0003_tools_core.sql` | `tool_categories`, `automation_tools`, `tool_developers`, `automation_tool_versions`, 태그 |
| `0004_tool_details.sql` | 연동, 데이터 분류, 비용, 성과, 첨부 |
| `0005_tool_workflow.sql` | 상태 이력, 검토 배정, 검토 의견, 위험 체크리스트 + `reject_mutation()` |
| `0006_demands.sql` | 수요, 매칭, 참여자 |
| `0007_feedback.sql` | 평가(+유니크 인덱스), 평가 이력, 개선 요청, 개선 이력 |
| `0008_observability.sql` | 감사 로그, 사용 이벤트, 알림 |
| `0009_phase2_phase3_reserved.sql` | **2·3단계 예약 테이블 10종. 1단계 코드는 읽지도 쓰지도 않음** |
| `0010_indexes.sql` | 상태·부서·카테고리 인덱스, 한국어 검색용 `pg_trgm` GIN |
| `0011_rls_policies.sql` | 전 테이블 RLS + 헬퍼 함수 7종 + 정책 약 50개 |
| `0012_reference_seed.sql` | 카테고리·연동시스템 마스터 (업무 데이터 아님) |

### 한국어 검색

Postgres 에는 한국어 형태소 분석기가 기본 포함되지 않습니다. `to_tsvector('korean', ...)`
을 쓸 수 없으므로 `pg_trgm` 의 trigram GIN 인덱스로 `ILIKE '%키워드%'` 를 빠르게 만듭니다.
형태소 기반 검색이 필요해지면 별도 확장을 설치하고 이 인덱스를 교체하면 됩니다.

## 2·3단계 예약 테이블

`0009` 의 테이블들은 **DDL 만 있고 1단계 코드는 건드리지 않습니다.**

`duplicate_detection_runs`, `duplicate_candidates`, `risk_assessments`,
`llm_review_runs`, `llm_review_results`, `ranking_snapshots`,
`reward_rules`, `developer_contributions`, `reward_ledgers`, `monthly_reward_snapshots`

`reward_ledgers` 는 해시 체인 컬럼을 갖습니다. 토큰 지급 기록은 나중에
조작 여부를 확인할 수 있어야 하기 때문입니다.

-- =============================================================================
-- 0009. 2·3단계 확장용 테이블 (예약)
--
-- ⚠️ 1단계 애플리케이션 코드는 이 테이블들을 **읽지도 쓰지도 않습니다**.
--    스키마를 미리 확정해 두어 2단계에서 데이터 마이그레이션 없이 기능을
--    붙일 수 있게 하려는 목적입니다.
--
--    관련 인터페이스: src/adapters/ai/types.ts
--    설계 근거: docs/ROADMAP.md, docs/DATA_MODEL.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2단계: 중복 탐지 (요구사항 14번)
-- -----------------------------------------------------------------------------
create table if not exists duplicate_detection_runs (
  id                uuid primary key default gen_random_uuid(),
  campus_id         uuid not null references campuses(id) on delete cascade,
  tool_version_id   uuid not null references automation_tool_versions(id) on delete cascade,
  -- 사용한 방식: EXACT_FIELD / KEYWORD / STRING_SIMILARITY / EMBEDDING / LLM
  method            text not null,
  model             text,
  -- 관리자가 조정 가능한 임계값 스냅샷 (85 / 70 / 50 기본)
  thresholds        jsonb not null default '{"nearIdentical":85,"highOverlap":70,"related":50}'::jsonb,
  status            text not null default 'PENDING',
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  created_by        uuid references profiles(id) on delete set null
);

create table if not exists duplicate_candidates (
  id                  uuid primary key default gen_random_uuid(),
  run_id              uuid not null references duplicate_detection_runs(id) on delete cascade,
  source_tool_id      uuid not null references automation_tools(id) on delete cascade,
  candidate_tool_id   uuid not null references automation_tools(id) on delete cascade,
  score               numeric(5, 2) not null check (score >= 0 and score <= 100),
  verdict             text not null,
  field_scores        jsonb not null default '{}'::jsonb,
  explanation         text not null default '',
  -- 최종 판정은 항상 사람이 한다 (요구사항 14번 6단계)
  human_verdict       text,
  human_verdict_by    uuid references profiles(id) on delete set null,
  human_verdict_at    timestamptz,
  created_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2단계: 위험 평가 (요구사항 15번)
-- -----------------------------------------------------------------------------
create table if not exists risk_assessments (
  id                      uuid primary key default gen_random_uuid(),
  tool_version_id         uuid not null references automation_tool_versions(id) on delete cascade,
  suggested_level         risk_level not null,
  -- 확정 등급은 사람이 정한다. CRITICAL 은 자동 승인 불가.
  confirmed_level         risk_level,
  confirmed_by            uuid references profiles(id) on delete set null,
  confirmed_at            timestamptz,
  factors                 jsonb not null default '[]'::jsonb,
  required_controls       jsonb not null default '[]'::jsonb,
  requires_human_approval boolean not null default true,
  model                   text,
  created_at              timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3단계: 멀티 LLM 품질검증
-- -----------------------------------------------------------------------------
create table if not exists llm_review_runs (
  id                  uuid primary key default gen_random_uuid(),
  tool_version_id     uuid not null references automation_tool_versions(id) on delete cascade,
  test_case_id        uuid,
  -- 모델 간 의견이 갈리면 반드시 사람이 확인한다.
  disagreement        boolean not null default false,
  aggregated_verdict  text,
  status              text not null default 'PENDING',
  started_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create table if not exists llm_review_results (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references llm_review_runs(id) on delete cascade,
  -- FACTUALITY / POLICY / SECURITY
  kind        text not null,
  model       text not null,
  passed      boolean not null,
  findings    jsonb not null default '[]'::jsonb,
  confidence  numeric(4, 3),
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3단계: 순위 (요구사항 16번)
-- -----------------------------------------------------------------------------
create table if not exists ranking_snapshots (
  id            uuid primary key default gen_random_uuid(),
  campus_id     uuid not null references campuses(id) on delete cascade,
  generated_at  timestamptz not null default now(),
  -- 가중치와 보정 기준을 스냅샷에 함께 저장해 재현 가능하게 한다.
  weights       jsonb not null,
  guards        jsonb not null,
  entries       jsonb not null default '[]'::jsonb
);

-- -----------------------------------------------------------------------------
-- 3단계: 개발자 토큰 (요구사항 17번)
-- Campus Token 은 암호화폐가 아닌 플랫폼 내부의 비금전성 포인트다.
-- -----------------------------------------------------------------------------
create table if not exists reward_rules (
  id            uuid primary key default gen_random_uuid(),
  campus_id     uuid not null references campuses(id) on delete cascade,
  code          text not null,
  description   text not null default '',
  points        integer not null default 0,
  is_active     boolean not null default true,
  effective_from date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (campus_id, code, effective_from)
);

create table if not exists developer_contributions (
  id            uuid primary key default gen_random_uuid(),
  campus_id     uuid not null references campuses(id) on delete cascade,
  developer_id  uuid not null references profiles(id) on delete cascade,
  tool_id       uuid references automation_tools(id) on delete set null,
  rule_code     text not null,
  -- 검증된 근거만 인정한다 (실제 활성 사용자, 성공 실행, 검증된 절감시간 등)
  evidence      jsonb not null default '{}'::jsonb,
  verified      boolean not null default false,
  verified_by   uuid references profiles(id) on delete set null,
  occurred_on   date not null default current_date,
  created_at    timestamptz not null default now()
);

-- 원장은 변경 불가능한 이력이다. 해시 체인으로 위변조를 탐지한다.
create table if not exists reward_ledgers (
  id                  uuid primary key default gen_random_uuid(),
  campus_id           uuid not null references campuses(id) on delete cascade,
  developer_id        uuid not null references profiles(id) on delete cascade,
  month               char(7) not null,  -- YYYY-MM
  amount              integer not null,
  reason              text not null default '',
  previous_entry_hash text,
  entry_hash          text not null unique,
  created_at          timestamptz not null default now()
);

create table if not exists monthly_reward_snapshots (
  id            uuid primary key default gen_random_uuid(),
  campus_id     uuid not null references campuses(id) on delete cascade,
  month         char(7) not null,
  totals        jsonb not null default '{}'::jsonb,
  finalized_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (campus_id, month)
);

drop trigger if exists trg_reward_ledgers_immutable on reward_ledgers;
create trigger trg_reward_ledgers_immutable
  before update or delete on reward_ledgers
  for each row execute function reject_mutation();

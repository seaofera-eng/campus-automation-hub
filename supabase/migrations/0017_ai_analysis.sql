-- =============================================================================
-- 0017. AI 분석 결과 저장
--
-- 0009 에서 예약해 둔 duplicate_detection_runs / duplicate_candidates /
-- risk_assessments 를 실제 구현으로 대체합니다. 그때는 "실행 이력"을 남기는
-- 모양으로 잡아 두었는데, 만들고 보니 필요한 것은 **도구 버전 하나당 최신 분석
-- 하나**였습니다. 버전이 바뀌면 새 행이 생기므로 이력은 버전을 따라 남습니다.
--
-- 0009 는 한 번도 적용된 적이 없어 버릴 데이터가 없습니다.
--
-- ⚠️ 이 마이그레이션 역시 실제 프로젝트에 적용해 검증한 적이 없습니다.
-- =============================================================================

drop table if exists duplicate_candidates;
drop table if exists duplicate_detection_runs;
drop table if exists risk_assessments;

-- -----------------------------------------------------------------------------
-- 중복 탐지
-- -----------------------------------------------------------------------------
create table if not exists duplicate_analyses (
  tool_version_id uuid primary key references automation_tool_versions(id) on delete cascade,
  tool_id         uuid not null references automation_tools(id) on delete cascade,
  -- DuplicateFinding[] — 후보별 판정·근거·처리 제안
  findings        jsonb not null default '[]'::jsonb,
  -- 몇 개 도구와 비교했는지. "몇 개만 보고 판단했다"는 오해를 막습니다.
  compared_count  integer not null default 0,
  model           text not null,
  generated_at    timestamptz not null default now(),
  -- 사람이 확인하기 전에는 참고 자료일 뿐입니다.
  human_reviewed  boolean not null default false,
  reviewed_by     uuid references profiles(id) on delete set null,
  reviewed_at     timestamptz
);

create index if not exists duplicate_analyses_tool_idx on duplicate_analyses (tool_id);

-- -----------------------------------------------------------------------------
-- 위험도 자동 평가
--
-- suggested_level 은 제안일 뿐이고, 확정 등급은 risk_checklists 에 남습니다.
-- 두 값을 나란히 두어야 "모델은 HIGH 로 봤는데 검토자가 MEDIUM 으로 정했다"가
-- 보입니다.
-- -----------------------------------------------------------------------------
create table if not exists risk_analyses (
  tool_version_id   uuid primary key references automation_tool_versions(id) on delete cascade,
  suggested_level   risk_level not null,
  summary           text not null default '',
  -- RiskFactorSuggestion[] — 체크리스트 14개 항목에 대한 의견과 근거
  suggestions       jsonb not null default '[]'::jsonb,
  required_controls jsonb not null default '[]'::jsonb,
  model             text not null,
  generated_at      timestamptz not null default now(),
  human_reviewed    boolean not null default false,
  reviewed_by       uuid references profiles(id) on delete set null,
  reviewed_at       timestamptz
);

-- -----------------------------------------------------------------------------
-- 수요 ↔ 도구 매칭
-- -----------------------------------------------------------------------------
create table if not exists demand_analyses (
  demand_id      uuid primary key references automation_demands(id) on delete cascade,
  -- COVERED / PARTIAL / NOT_COVERED
  outcome        text not null,
  findings       jsonb not null default '[]'::jsonb,
  compared_count integer not null default 0,
  model          text not null,
  generated_at   timestamptz not null default now(),
  human_reviewed boolean not null default false,
  reviewed_by    uuid references profiles(id) on delete set null,
  reviewed_at    timestamptz
);

-- -----------------------------------------------------------------------------
-- RLS — 분석 결과는 로그인한 사람이면 읽을 수 있고,
--        쓰기는 서비스 역할(분석 스크립트)만 합니다.
-- -----------------------------------------------------------------------------
alter table duplicate_analyses enable row level security;
alter table risk_analyses      enable row level security;
alter table demand_analyses    enable row level security;

create policy duplicate_analyses_read on duplicate_analyses
  for select using (auth.role() = 'authenticated');
create policy risk_analyses_read on risk_analyses
  for select using (auth.role() = 'authenticated');
create policy demand_analyses_read on demand_analyses
  for select using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 멀티 LLM 품질검증
--
-- 0009 의 llm_review_runs / llm_review_results 를 대체합니다. 그쪽은 실행 이력을
-- 두 테이블로 나눠 두었는데, 관점이 둘뿐이고 항상 같이 돌아서 한 행에 담는 편이
-- 읽기 쉽습니다. 관점별 모델과 지적 내용은 results 안에 들어갑니다.
-- -----------------------------------------------------------------------------
drop table if exists llm_review_results;
drop table if exists llm_review_runs;

create table if not exists quality_reviews (
  tool_version_id uuid primary key references automation_tool_versions(id) on delete cascade,
  -- QualityReviewResult[] — 관점별 모델·통과 여부·지적 내용
  results         jsonb not null default '[]'::jsonb,
  -- 모델끼리 판정이 갈렸는가. 갈리면 자동으로 한쪽 편들지 않습니다.
  disagreement    boolean not null default false,
  -- PASS / NEEDS_HUMAN_REVIEW / FAIL
  verdict         text not null,
  model           text not null,
  generated_at    timestamptz not null default now(),
  human_reviewed  boolean not null default false,
  reviewed_by     uuid references profiles(id) on delete set null,
  reviewed_at     timestamptz
);

alter table quality_reviews enable row level security;

create policy quality_reviews_read on quality_reviews
  for select using (auth.role() = 'authenticated');

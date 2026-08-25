-- =============================================================================
-- 0005. 승인 워크플로 (상태 이력 · 검토 배정 · 검토 의견 · 위험 체크리스트)
-- =============================================================================

-- 상태 이력은 append-only 다. 수정·삭제하지 않는다 (요구사항 7번).
create table if not exists tool_status_history (
  id              uuid primary key default gen_random_uuid(),
  tool_id         uuid not null references automation_tools(id) on delete cascade,
  campus_id       uuid not null references campuses(id) on delete cascade,
  from_status     tool_status,
  to_status       tool_status not null,
  changed_by      uuid not null references profiles(id),
  changed_at      timestamptz not null default now(),
  -- 변경 이유는 필수다. 나중에 왜 바뀌었는지 확인할 수 있어야 한다.
  reason          text not null check (length(trim(reason)) >= 5),
  review_comment  text not null default ''
);

create table if not exists review_assignments (
  id              uuid primary key default gen_random_uuid(),
  campus_id       uuid not null references campuses(id) on delete cascade,
  tool_id         uuid not null references automation_tools(id) on delete cascade,
  tool_version_id uuid not null references automation_tool_versions(id) on delete cascade,
  reviewer_user_id uuid not null references profiles(id),
  status          review_assignment_status not null default 'ASSIGNED',
  assigned_by     uuid not null references profiles(id),
  assigned_at     timestamptz not null default now(),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists review_comments (
  id              uuid primary key default gen_random_uuid(),
  tool_id         uuid not null references automation_tools(id) on delete cascade,
  tool_version_id uuid not null references automation_tool_versions(id) on delete cascade,
  author_user_id  uuid not null references profiles(id),
  kind            review_comment_kind not null default 'GENERAL',
  body            text not null check (length(trim(body)) > 0),
  created_at      timestamptz not null default now()
);

-- 1단계에서는 사람이 직접 작성하는 정적 체크리스트다.
-- 2단계 RiskAssessmentService 가 붙으면 초안을 제안하고 확정은 계속 사람이 한다.
create table if not exists risk_checklists (
  id              uuid primary key default gen_random_uuid(),
  tool_version_id uuid not null unique references automation_tool_versions(id) on delete cascade,
  -- [{ code, applies, note }] 형태. 항목 정의는 앱의
  -- src/domain/tool/risk-checklist-rules.ts 가 단일 진실 원천이다.
  items           jsonb not null default '[]'::jsonb,
  risk_level      risk_level not null,
  rationale       text not null default '',
  reviewed_by     uuid not null references profiles(id),
  reviewed_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_review_assignments_updated_at on review_assignments;
create trigger trg_review_assignments_updated_at before update on review_assignments
  for each row execute function set_updated_at();

drop trigger if exists trg_risk_checklists_updated_at on risk_checklists;
create trigger trg_risk_checklists_updated_at before update on risk_checklists
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 상태 이력 불변성 보장
-- append-only 테이블이므로 수정·삭제를 DB 차원에서 막는다.
-- -----------------------------------------------------------------------------
create or replace function reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '이 테이블은 추가만 가능합니다. 기존 이력은 수정하거나 삭제할 수 없습니다.';
end;
$$;

drop trigger if exists trg_tool_status_history_immutable on tool_status_history;
create trigger trg_tool_status_history_immutable
  before update or delete on tool_status_history
  for each row execute function reject_mutation();

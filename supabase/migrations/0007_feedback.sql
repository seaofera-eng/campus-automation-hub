-- =============================================================================
-- 0007. 평가와 개선 요청 (요구사항 9번)
-- =============================================================================

create table if not exists tool_evaluations (
  id                uuid primary key default gen_random_uuid(),
  campus_id         uuid not null references campuses(id) on delete cascade,
  tool_id           uuid not null references automation_tools(id) on delete cascade,
  tool_version_id   uuid not null references automation_tool_versions(id) on delete cascade,
  evaluator_user_id uuid not null references profiles(id) on delete cascade,

  -- 7개 항목, 각 1~5점
  problem_solving   smallint not null check (problem_solving between 1 and 5),
  work_efficiency   smallint not null check (work_efficiency between 1 and 5),
  usability         smallint not null check (usability between 1 and 5),
  stability         smallint not null check (stability between 1 and 5),
  accuracy          smallint not null check (accuracy between 1 and 5),
  spread_potential  smallint not null check (spread_potential between 1 and 5),
  overall           smallint not null check (overall between 1 and 5),

  comment         text not null default '',
  revision_count  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- 요구사항 9번: 동일 사용자가 동일 버전에 여러 평가를 등록하지 못하게 한다.
-- 소프트 삭제된 평가는 제외하므로 부분 유니크 인덱스를 쓴다.
create unique index if not exists uq_evaluation_user_version
  on tool_evaluations (evaluator_user_id, tool_version_id)
  where deleted_at is null;

-- 수정은 가능하되 변경 이력을 남긴다.
create table if not exists evaluation_history (
  id                uuid primary key default gen_random_uuid(),
  evaluation_id     uuid not null references tool_evaluations(id) on delete cascade,
  previous_scores   jsonb not null,
  previous_comment  text not null default '',
  changed_by        uuid not null references profiles(id),
  changed_at        timestamptz not null default now()
);

create table if not exists improvement_requests (
  id                            uuid primary key default gen_random_uuid(),
  campus_id                     uuid not null references campuses(id) on delete cascade,
  tool_id                       uuid not null references automation_tools(id) on delete cascade,
  title                         text not null,
  request_type                  improvement_type not null,
  detail                        text not null default '',
  business_impact               impact_level not null default 'MEDIUM',
  urgency                       impact_level not null default 'MEDIUM',
  requester_user_id             uuid not null references profiles(id),
  assigned_developer_user_id    uuid references profiles(id) on delete set null,
  status                        improvement_status not null default 'OPEN',
  handling_comment              text not null default '',
  target_completion_date        date,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  created_by                    uuid not null references profiles(id),
  deleted_at                    timestamptz
);

create table if not exists improvement_request_history (
  id                      uuid primary key default gen_random_uuid(),
  improvement_request_id  uuid not null references improvement_requests(id) on delete cascade,
  from_status             improvement_status,
  to_status               improvement_status not null,
  changed_by              uuid not null references profiles(id),
  changed_at              timestamptz not null default now(),
  comment                 text not null default ''
);

drop trigger if exists trg_evaluations_updated_at on tool_evaluations;
create trigger trg_evaluations_updated_at before update on tool_evaluations
  for each row execute function set_updated_at();

drop trigger if exists trg_improvements_updated_at on improvement_requests;
create trigger trg_improvements_updated_at before update on improvement_requests
  for each row execute function set_updated_at();

-- 이력 테이블은 추가만 가능하다.
drop trigger if exists trg_evaluation_history_immutable on evaluation_history;
create trigger trg_evaluation_history_immutable
  before update or delete on evaluation_history
  for each row execute function reject_mutation();

drop trigger if exists trg_improvement_history_immutable on improvement_request_history;
create trigger trg_improvement_history_immutable
  before update or delete on improvement_request_history
  for each row execute function reject_mutation();

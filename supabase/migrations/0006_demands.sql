-- =============================================================================
-- 0006. 자동화 수요 (요구사항 8번)
-- =============================================================================

create table if not exists automation_demands (
  id                    uuid primary key default gen_random_uuid(),
  campus_id             uuid not null references campuses(id) on delete cascade,
  title                 text not null,
  department_id         uuid not null references departments(id),
  requester_user_id     uuid not null references profiles(id),

  current_work_description text not null default '',
  most_painful_step        text not null default '',
  input_materials          text not null default '',
  desired_outcome          text not null default '',
  systems_in_use           text not null default '',
  work_frequency           work_frequency not null default 'MONTHLY',
  expected_user_count      integer,

  contains_personal_data              boolean not null default false,
  contains_academic_or_research_data  boolean not null default false,
  requires_human_approval             boolean not null default true,

  required_features       text[] not null default '{}',
  optional_features       text[] not null default '{}',
  expected_benefit        text not null default '',
  desired_completion_date date,

  status      demand_status not null default 'DRAFT',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid not null references profiles(id),
  deleted_at  timestamptz
);

-- 수요와 기존 도구의 연결. 1단계에서는 사람이 직접 연결한다.
-- rationale 은 사람이 쓴 근거이며 AI 점수가 아니다.
create table if not exists demand_matches (
  id          uuid primary key default gen_random_uuid(),
  demand_id   uuid not null references automation_demands(id) on delete cascade,
  tool_id     uuid not null references automation_tools(id) on delete cascade,
  match_type  match_type not null,
  rationale   text not null default '',
  matched_by  uuid not null references profiles(id),
  matched_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (demand_id, tool_id)
);

create table if not exists demand_participants (
  id                uuid primary key default gen_random_uuid(),
  demand_id         uuid not null references automation_demands(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  participant_role  participant_role not null default 'DEVELOPER',
  message           text not null default '',
  joined_at         timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (demand_id, user_id)
);

drop trigger if exists trg_demands_updated_at on automation_demands;
create trigger trg_demands_updated_at before update on automation_demands
  for each row execute function set_updated_at();

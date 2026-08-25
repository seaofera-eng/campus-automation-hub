-- =============================================================================
-- 0003. 도구 핵심 테이블
--
-- 설계 요점: 자주 바뀌지 않는 식별·소유·상태 정보는 automation_tools 에,
-- 상세 내용은 automation_tool_versions 에 둔다. 평가는 버전에 붙기 때문에
-- 새 버전이 나오면 그 버전에 대해 다시 평가를 받는다.
-- =============================================================================

create table if not exists tool_categories (
  id          uuid primary key default gen_random_uuid(),
  campus_id   uuid not null references campuses(id) on delete cascade,
  code        text not null,
  name        text not null,
  description text not null default '',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references profiles(id) on delete set null,
  unique (campus_id, code)
);

create table if not exists automation_tools (
  id                          uuid primary key default gen_random_uuid(),
  campus_id                   uuid not null references campuses(id) on delete cascade,
  name                        text not null,
  summary                     text not null default '',
  category_id                 uuid not null references tool_categories(id),
  department_id               uuid not null references departments(id),
  owner_user_id               uuid not null references profiles(id),
  operations_manager_user_id  uuid references profiles(id) on delete set null,
  visibility                  visibility_scope not null default 'CAMPUS',
  status                      tool_status not null default 'DRAFT',
  -- 현재 공개 중인 버전. 버전 생성 순환 참조를 피하려 FK 를 나중에 붙인다.
  current_version_id          uuid,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  created_by                  uuid not null references profiles(id),
  deleted_at                  timestamptz
);

-- 도구 개발자는 여러 명일 수 있다.
create table if not exists tool_developers (
  tool_id     uuid not null references automation_tools(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (tool_id, user_id)
);

create table if not exists automation_tool_versions (
  id                uuid primary key default gen_random_uuid(),
  tool_id           uuid not null references automation_tools(id) on delete cascade,
  campus_id         uuid not null references campuses(id) on delete cascade,
  version_label     text not null default 'v1.0',
  change_note       text not null default '',

  -- 기본정보
  description       text not null default '',
  problem_statement text not null default '',

  -- 기능정보
  key_features            text[] not null default '{}',
  current_workflow        text not null default '',
  automated_workflow      text not null default '',
  input_data              text not null default '',
  output_data             text not null default '',
  expected_users          text not null default '',
  monthly_expected_usage  integer,
  automation_level        automation_level not null default 'HUMAN_IN_THE_LOOP',

  -- 연동 (상세는 tool_integrations, 여기에는 기타 메모만)
  other_integration_note  text not null default '',

  -- 보안·데이터 (분류 항목은 tool_data_classifications)
  sends_data_externally      boolean not null default false,
  external_transfer_targets  text not null default '',
  data_storage_location      text not null default '',
  data_retention_period      text not null default '',
  has_execution_log          boolean not null default false,
  requires_human_approval    boolean not null default true,

  -- 링크
  repository_url  text not null default '',
  service_url     text not null default '',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid not null references profiles(id),
  deleted_at  timestamptz
);

-- current_version_id 순환 참조를 여기서 연결한다.
do $$ begin
  alter table automation_tools
    add constraint automation_tools_current_version_fk
    foreign key (current_version_id) references automation_tool_versions(id)
    deferrable initially deferred;
exception when duplicate_object then null; end $$;

create table if not exists tool_tags (
  id          uuid primary key default gen_random_uuid(),
  campus_id   uuid not null references campuses(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (campus_id, name)
);

-- 태그 연결은 완전 삭제해도 되는 데이터다 (소프트 삭제 대상 아님).
create table if not exists tool_tag_relations (
  tool_id     uuid not null references automation_tools(id) on delete cascade,
  tag_id      uuid not null references tool_tags(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (tool_id, tag_id)
);

drop trigger if exists trg_tool_categories_updated_at on tool_categories;
create trigger trg_tool_categories_updated_at before update on tool_categories
  for each row execute function set_updated_at();

drop trigger if exists trg_automation_tools_updated_at on automation_tools;
create trigger trg_automation_tools_updated_at before update on automation_tools
  for each row execute function set_updated_at();

drop trigger if exists trg_tool_versions_updated_at on automation_tool_versions;
create trigger trg_tool_versions_updated_at before update on automation_tool_versions
  for each row execute function set_updated_at();

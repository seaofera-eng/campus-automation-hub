-- =============================================================================
-- 0004. 도구 상세 (연동 · 데이터분류 · 비용 · 성과 · 첨부)
-- 모두 버전에 종속된다.
-- =============================================================================

create table if not exists integration_systems (
  id          uuid primary key default gen_random_uuid(),
  campus_id   uuid not null references campuses(id) on delete cascade,
  code        text not null,
  name        text not null,
  -- 외부 서비스인지 여부는 향후 위험 평가(요구사항 15번)의 입력이 된다.
  is_external boolean not null default false,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (campus_id, code)
);

create table if not exists tool_integrations (
  id                    uuid primary key default gen_random_uuid(),
  tool_version_id       uuid not null references automation_tool_versions(id) on delete cascade,
  integration_system_id uuid not null references integration_systems(id),
  note                  text not null default '',
  created_at            timestamptz not null default now(),
  unique (tool_version_id, integration_system_id)
);

-- 8종 분류를 boolean 컬럼 나열이 아니라 행으로 저장한다.
-- 분류 항목이 추가되어도 스키마를 바꿀 필요가 없고,
-- 2단계 위험 평가가 이 행들을 그대로 입력으로 쓸 수 있다.
create table if not exists tool_data_classifications (
  id              uuid primary key default gen_random_uuid(),
  tool_version_id uuid not null references automation_tool_versions(id) on delete cascade,
  classification  data_classification not null,
  in_use          boolean not null default false,
  note            text not null default '',
  created_at      timestamptz not null default now(),
  unique (tool_version_id, classification)
);

create table if not exists tool_costs (
  tool_version_id           uuid primary key references automation_tool_versions(id) on delete cascade,
  initial_development_cost  numeric(14, 0),
  monthly_operation_cost    numeric(14, 0),
  monthly_llm_cost          numeric(14, 0),
  external_service_cost     numeric(14, 0),
  cost_per_user             numeric(14, 0),
  cost_basis                text not null default '',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists tool_metrics (
  tool_version_id               uuid primary key references automation_tool_versions(id) on delete cascade,
  current_processing_minutes    integer,
  automated_processing_minutes  integer,
  monthly_saved_hours           numeric(10, 1),
  error_reduction_note          text not null default '',
  expected_benefit              text not null default '',
  measurement_method            text not null default '',
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create table if not exists tool_attachments (
  id              uuid primary key default gen_random_uuid(),
  tool_version_id uuid not null references automation_tool_versions(id) on delete cascade,
  kind            attachment_kind not null default 'OTHER',
  file_name       text not null,
  mime_type       text not null,
  -- 업로드 크기 제한은 애플리케이션에서도 검사하지만 여기서도 방어한다 (10MB)
  byte_size       bigint not null check (byte_size > 0 and byte_size <= 10485760),
  storage_path    text not null,
  created_at      timestamptz not null default now(),
  created_by      uuid not null references profiles(id)
);

drop trigger if exists trg_integration_systems_updated_at on integration_systems;
create trigger trg_integration_systems_updated_at before update on integration_systems
  for each row execute function set_updated_at();

drop trigger if exists trg_tool_costs_updated_at on tool_costs;
create trigger trg_tool_costs_updated_at before update on tool_costs
  for each row execute function set_updated_at();

drop trigger if exists trg_tool_metrics_updated_at on tool_metrics;
create trigger trg_tool_metrics_updated_at before update on tool_metrics
  for each row execute function set_updated_at();

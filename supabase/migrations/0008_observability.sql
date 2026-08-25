-- =============================================================================
-- 0008. 감사 로그 · 사용 이벤트 · 알림 (요구사항 18번)
-- =============================================================================

-- 감사 로그는 append-only 이며 관리자 작업도 예외 없이 기록한다.
-- 민감한 값 자체는 저장하지 않고 "어떤 필드가 바뀌었는지"만 남긴다.
create table if not exists audit_logs (
  id              uuid primary key default gen_random_uuid(),
  campus_id       uuid not null references campuses(id) on delete cascade,
  action          text not null,
  actor_user_id   uuid references profiles(id) on delete set null,
  actor_role      text,
  target_type     text not null,
  target_id       text,
  outcome         text not null default 'SUCCESS' check (outcome in ('SUCCESS', 'FAILURE')),
  summary         text not null default '',
  changed_fields  text[] not null default '{}',
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create table if not exists usage_events (
  id          uuid primary key default gen_random_uuid(),
  campus_id   uuid not null references campuses(id) on delete cascade,
  tool_id     uuid not null references automation_tools(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null,
  event_type  text not null check (event_type in ('VIEW', 'LAUNCH')),
  occurred_at timestamptz not null default now()
);

create table if not exists notifications (
  id                uuid primary key default gen_random_uuid(),
  campus_id         uuid not null references campuses(id) on delete cascade,
  recipient_user_id uuid not null references profiles(id) on delete cascade,
  kind              text not null,
  title             text not null,
  body              text not null default '',
  link_path         text not null default '',
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- 감사 로그와 사용 이벤트는 수정·삭제할 수 없다.
drop trigger if exists trg_audit_logs_immutable on audit_logs;
create trigger trg_audit_logs_immutable
  before update or delete on audit_logs
  for each row execute function reject_mutation();

drop trigger if exists trg_usage_events_immutable on usage_events;
create trigger trg_usage_events_immutable
  before update or delete on usage_events
  for each row execute function reject_mutation();

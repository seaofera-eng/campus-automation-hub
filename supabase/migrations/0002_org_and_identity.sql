-- =============================================================================
-- 0002. 조직과 사용자
-- =============================================================================

create table if not exists campuses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  short_name  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists departments (
  id          uuid primary key default gen_random_uuid(),
  campus_id   uuid not null references campuses(id) on delete cascade,
  name        text not null,
  code        text not null,
  parent_id   uuid references departments(id) on delete set null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  deleted_at  timestamptz,
  unique (campus_id, code)
);

-- auth.users 와 1:1 로 대응하는 프로필.
-- 인증 자체는 Supabase Auth 가 담당하고, 여기에는 조직 정보만 둔다.
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  campus_id       uuid not null references campuses(id) on delete cascade,
  email           text not null unique,
  name            text not null,
  department_id   uuid references departments(id) on delete set null,
  title           text not null default '',
  is_active       boolean not null default true,
  -- 데모 계정과 운영 계정을 구분한다 (요구사항 18번)
  is_demo_account boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  deleted_at      timestamptz
);

-- 역할을 별도 테이블로 두어 향후 다중 역할 부여로 확장할 수 있게 한다.
-- 1단계에서는 사용자당 한 행만 사용한다.
create table if not exists user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  campus_id   uuid not null references campuses(id) on delete cascade,
  role        user_role not null,
  granted_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, role)
);

drop trigger if exists trg_campuses_updated_at on campuses;
create trigger trg_campuses_updated_at before update on campuses
  for each row execute function set_updated_at();

drop trigger if exists trg_departments_updated_at on departments;
create trigger trg_departments_updated_at before update on departments
  for each row execute function set_updated_at();

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_user_roles_updated_at on user_roles;
create trigger trg_user_roles_updated_at before update on user_roles
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS 정책에서 반복 사용하는 헬퍼
-- security definer 로 두어 정책 안에서 재귀 호출이 생기지 않게 한다.
-- -----------------------------------------------------------------------------

create or replace function current_role_name()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from user_roles where user_id = auth.uid() limit 1;
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = 'ADMIN'
  );
$$;

create or replace function is_reviewer_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role in ('REVIEWER', 'ADMIN')
  );
$$;

create or replace function current_campus_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select campus_id from profiles where id = auth.uid() limit 1;
$$;

create or replace function current_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from profiles where id = auth.uid() limit 1;
$$;

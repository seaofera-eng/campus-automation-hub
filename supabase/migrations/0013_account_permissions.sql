-- -----------------------------------------------------------------------------
-- 역할을 계정 종류 + 관리 권한 + 신분 으로 나눈다.
--
-- 예전에는 user_role 하나(REQUESTER/DEVELOPER/REVIEWER/ADMIN)가 권한과 신분을
-- 겸했다. 실제로는 한 사람이 수요도 올리고 도구도 만든다. 둘을 나눌 이유가 없었다.
--
--   account_type      이용자(USER) / 관리자(ADMIN)
--   admin_permission  관리자가 어디까지 할 수 있는가 (여러 줄로 부여)
--   member_type       학내 신분. 권한이 아니다.
--
-- 이 저장소의 마이그레이션은 아직 실제 Supabase 프로젝트에 적용된 적이 없다.
-- 적용 전 docs/SECURITY.md 의 RLS 검증 체크리스트를 먼저 밟을 것.
-- -----------------------------------------------------------------------------

-- 1) 새 타입 ---------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type account_type as enum ('USER', 'ADMIN');
  end if;

  if not exists (select 1 from pg_type where typname = 'admin_permission') then
    create type admin_permission as enum (
      'REVIEW',
      'MANAGE_USERS',
      'MANAGE_CATEGORIES',
      'MANAGE_TOOLS',
      'MANAGE_NOTICES',
      'VIEW_AUDIT'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'member_type') then
    create type member_type as enum ('STUDENT', 'STAFF', 'PROFESSOR', 'EXTERNAL');
  end if;
end $$;

-- 2) 신분은 프로필에 둔다 ---------------------------------------------------

alter table profiles
  add column if not exists member_type member_type not null default 'STAFF';

-- 3) user_roles 를 권한 표로 바꾼다 ------------------------------------------
--
-- 한 사람이 여러 관리 권한을 가지므로 계정 종류는 모든 줄에 같은 값이 들어가고,
-- 권한은 줄마다 하나씩 들어간다. 이용자는 admin_permission 이 null 인 한 줄만 갖는다.

alter table user_roles
  add column if not exists account_type account_type,
  add column if not exists admin_permission admin_permission;

-- 기존 데이터 이관: ADMIN 이었으면 모든 권한을, REVIEWER 였으면 검토 권한만 준다.
update user_roles set account_type = 'ADMIN' where role = 'ADMIN' and account_type is null;
update user_roles set account_type = 'ADMIN' where role = 'REVIEWER' and account_type is null;
update user_roles set account_type = 'USER' where account_type is null;

insert into user_roles (user_id, campus_id, role, account_type, admin_permission)
select r.user_id, r.campus_id, r.role, 'ADMIN', p.permission
from user_roles r
cross join (
  select unnest(enum_range(null::admin_permission)) as permission
) p
where r.role = 'ADMIN' and r.admin_permission is null
on conflict do nothing;

insert into user_roles (user_id, campus_id, role, account_type, admin_permission)
select user_id, campus_id, role, 'ADMIN', 'REVIEW'
from user_roles
where role = 'REVIEWER' and admin_permission is null
on conflict do nothing;

alter table user_roles alter column account_type set not null;

-- 예전 유니크 제약은 (user_id, role) 이었다. 이제 한 사람이 권한을 여러 개 가지므로
-- (user_id, admin_permission) 으로 바꾼다. null 은 유니크 비교에서 제외되므로
-- 이용자 줄이 중복되지 않도록 부분 인덱스를 따로 건다.
alter table user_roles drop constraint if exists user_roles_user_id_role_key;

create unique index if not exists uq_user_roles_permission
  on user_roles (user_id, admin_permission)
  where admin_permission is not null;

create unique index if not exists uq_user_roles_plain_user
  on user_roles (user_id)
  where admin_permission is null;

-- 이용자 계정에는 관리 권한을 줄 수 없다. 애플리케이션도 같은 규칙을 검사한다.
alter table user_roles drop constraint if exists chk_user_roles_permission_requires_admin;
alter table user_roles add constraint chk_user_roles_permission_requires_admin
  check (admin_permission is null or account_type = 'ADMIN');

-- 4) RLS 헬퍼 교체 -----------------------------------------------------------
--
-- 정책들이 is_admin() / is_reviewer_or_admin() 을 부르고 있으므로 이름은 유지하고
-- 내용만 새 모델로 바꾼다. 0011 의 정책 본문을 고치지 않아도 된다.

create or replace function has_admin_permission(needed admin_permission)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid()
      and account_type = 'ADMIN'
      and admin_permission = needed
  );
$$;

create or replace function current_account_type()
returns account_type
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select account_type from user_roles where user_id = auth.uid() limit 1),
    'USER'::account_type
  );
$$;

-- 관리 화면 진입 = 권한을 하나라도 가진 관리자.
-- 권한 없는 관리자 계정은 이용자와 같다.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid()
      and account_type = 'ADMIN'
      and admin_permission is not null
  );
$$;

create or replace function is_reviewer_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select has_admin_permission('REVIEW');
$$;

-- 5) 계정 관리 권한이 있어야 남의 권한을 바꿀 수 있다 --------------------------
--
-- 자기 권한을 스스로 못 바꾸는 조건(user_id <> auth.uid())은 그대로 둔다.
-- 애플리케이션의 changeAccountPermissions() 도 같은 조건을 건다.

drop policy if exists user_roles_admin_write on user_roles;
create policy user_roles_admin_write on user_roles
  for all
  using (has_admin_permission('MANAGE_USERS') and user_id <> auth.uid())
  with check (has_admin_permission('MANAGE_USERS') and user_id <> auth.uid());

-- 6) 옛 컬럼은 남겨 둔다 ------------------------------------------------------
--
-- user_roles.role 과 user_role 타입은 지우지 않는다. 실제 DB 에 적용한 뒤
-- 새 컬럼으로 읽는 것이 확인되면 그때 별도 마이그레이션으로 정리한다.
-- 되돌릴 길을 먼저 없애지 않는다.

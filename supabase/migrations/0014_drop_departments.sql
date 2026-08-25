-- -----------------------------------------------------------------------------
-- 부서를 없애고, 도구에 실행 방식과 추천 대상을 둔다.
--
-- 리뷰 4.1절: "[담당 부서] 속성을 표시할 필요가 없음, 오히려 추천 수요자를
-- 표시하는게 좋을 듯" · "프로그램 성격도 구별하는 속성이 있어야 할 듯.
-- 앱인지, 웹에서 실행하는지, 윈도우에서 돌아가는 건지 표기 필요"
--
-- 부서로 칸막이를 치면 옆 부서가 이미 만든 도구를 못 찾아 같은 것을 또 만들게 된다.
-- 이 플랫폼은 서로 보라고 올리는 곳이므로 칸막이를 걷는다.
--
-- 이 저장소의 마이그레이션은 아직 실제 Supabase 프로젝트에 적용된 적이 없다.
-- 적용 전 docs/SECURITY.md 의 RLS 검증 체크리스트를 먼저 밟을 것.
-- -----------------------------------------------------------------------------

-- 1) 도구의 새 속성 -----------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'runtime_kind') then
    create type runtime_kind as enum ('WEB', 'DESKTOP', 'MOBILE', 'SCRIPT', 'OTHER');
  end if;
end $$;

alter table tools
  add column if not exists runtime_kind runtime_kind not null default 'WEB',
  -- 비어 있으면 "누구나"로 읽는다.
  add column if not exists recommended_for member_type[] not null default '{}';

comment on column tools.runtime_kind is '어디서 실행하는가. 설치가 필요한지가 쓸지 말지를 가른다.';
comment on column tools.recommended_for is '누구에게 맞는 도구인가. 비어 있으면 누구나. 부서를 대신한다.';

-- 2) 부서 참조 제거 -----------------------------------------------------------
--
-- 컬럼을 먼저 떨어뜨리고 표는 마지막에 지운다.

alter table tools drop column if exists department_id;
alter table tools drop column if exists visibility;
alter table tools drop column if exists operations_manager_user_id;
alter table demands drop column if exists department_id;
alter table profiles drop column if exists department_id;

-- 공개 범위 타입도 더 쓰지 않는다. 남은 참조가 없을 때만 지운다.
do $$
begin
  if not exists (
    select 1 from pg_attribute a
    join pg_type t on t.oid = a.atttypid
    where t.typname = 'visibility_scope' and a.attisdropped = false
  ) then
    drop type if exists visibility_scope;
  end if;
end $$;

-- 3) RLS 헬퍼에서 부서 조건 제거 ------------------------------------------------
--
-- current_department_id() 를 부르던 정책이 사라졌으므로 함수도 정리한다.

drop function if exists current_department_id();

-- 도구 읽기 규칙이 단순해졌다. 남은 구분은 "임시저장은 만든 사람만 본다" 하나뿐.
create or replace function can_read_tool(target_tool_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tools t
    where t.id = target_tool_id
      and t.deleted_at is null
      and (
        t.owner_user_id = auth.uid()
        or auth.uid() = any(t.developer_user_ids)
        or has_admin_permission('REVIEW')
        or t.status <> 'DRAFT'
      )
  );
$$;

-- 4) 부서 표 제거 -------------------------------------------------------------

drop table if exists departments cascade;

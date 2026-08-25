-- -----------------------------------------------------------------------------
-- 5단계 — 토큰 · 공지 · 수요 문의 · 수요 첨부
--
-- 리뷰 1절:  "[공지게시판]도 생성해서 노출"
-- 리뷰 6.4절: "완성된 도구 중에 마음에 드는 하나의 도구에 토큰을 수여할 수 있는 시스템"
--            "자동화하려는 업무와 관련된 자료를 업로드 할 수 있도록 첨부파일"
--            "참여 신청을 하지 않고 댓글만 다는 기능"
--
-- 이 저장소의 마이그레이션은 아직 실제 Supabase 프로젝트에 적용된 적이 없다.
-- 적용 전 docs/SECURITY.md 의 RLS 검증 체크리스트를 먼저 밟을 것.
-- -----------------------------------------------------------------------------

-- 1) 토큰 원장 ---------------------------------------------------------------
--
-- 표 자체는 0009 에서 예약해 두었다. 여기서 실제로 쓰는 모양으로 맞춘다.
-- **append-only 다.** 0009 의 트리거가 수정·삭제를 DB 차원에서 막는다.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'reward_entry_kind') then
    create type reward_entry_kind as enum ('GRANT', 'AWARD');
  end if;
end $$;

alter table reward_ledgers
  add column if not exists kind reward_entry_kind not null default 'GRANT',
  add column if not exists demand_id uuid references demands(id) on delete set null,
  add column if not exists tool_id uuid references tools(id) on delete set null,
  add column if not exists awarded_by uuid references profiles(id) on delete set null,
  add column if not exists note text not null default '';

-- 한 수요에 한 번만 수여한다. 애플리케이션도 같은 규칙을 검사하지만,
-- 두 요청이 동시에 들어오면 여기서 막힌다. (평가 중복 방지와 같은 방식)
create unique index if not exists uq_reward_award_per_demand
  on reward_ledgers (demand_id)
  where kind = 'AWARD' and demand_id is not null;

-- 차감은 아직 없다. 음수가 들어오면 잔액 계산이 뒤집히므로 막아 둔다.
alter table reward_ledgers drop constraint if exists chk_reward_amount_positive;
alter table reward_ledgers add constraint chk_reward_amount_positive check (amount > 0);

create index if not exists idx_reward_ledgers_user on reward_ledgers (user_id, created_at desc);

-- 2) 공지 -------------------------------------------------------------------

create table if not exists notices (
  id              uuid primary key default gen_random_uuid(),
  campus_id       uuid not null references campuses(id) on delete cascade,
  title           text not null,
  body            text not null,
  pinned          boolean not null default false,
  -- 내린 공지는 지우지 않고 감춘다. 무엇을 공지했는지는 남아야 한다.
  is_published    boolean not null default true,
  author_user_id  uuid not null references profiles(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_notices_updated_at on notices;
create trigger trg_notices_updated_at before update on notices
  for each row execute function set_updated_at();

create index if not exists idx_notices_campus on notices (campus_id, pinned desc, created_at desc);

-- 3) 수요 문의 ---------------------------------------------------------------

create table if not exists demand_comments (
  id              uuid primary key default gen_random_uuid(),
  campus_id       uuid not null references campuses(id) on delete cascade,
  demand_id       uuid not null references demands(id) on delete cascade,
  author_user_id  uuid not null references profiles(id) on delete restrict,
  body            text not null,
  created_at      timestamptz not null default now(),
  -- 지운 글은 감추기만 한다. 통째로 사라지면 남은 답글이 이상해진다.
  deleted_at      timestamptz
);

create index if not exists idx_demand_comments_demand
  on demand_comments (demand_id, created_at);

-- 4) 수요 첨부 ---------------------------------------------------------------
--
-- 저장 경로에 사용자가 정한 파일명을 쓰지 않는다. 도구 첨부와 같은 규칙이다.

create table if not exists demand_attachments (
  id            uuid primary key default gen_random_uuid(),
  campus_id     uuid not null references campuses(id) on delete cascade,
  demand_id     uuid not null references demands(id) on delete cascade,
  file_name     text not null,
  storage_path  text not null unique,
  content_type  text not null,
  byte_size     bigint not null check (byte_size > 0),
  uploaded_by   uuid not null references profiles(id) on delete restrict,
  created_at    timestamptz not null default now()
);

create index if not exists idx_demand_attachments_demand on demand_attachments (demand_id);

-- 5) RLS --------------------------------------------------------------------

alter table notices            enable row level security;
alter table demand_comments    enable row level security;
alter table demand_attachments enable row level security;

-- 공지는 올라온 것만 모두가 읽는다. 내린 것은 공지 관리 권한자만.
drop policy if exists notices_read on notices;
create policy notices_read on notices
  for select
  using (campus_id = current_campus_id() and (is_published or has_admin_permission('MANAGE_NOTICES')));

drop policy if exists notices_write on notices;
create policy notices_write on notices
  for all
  using (has_admin_permission('MANAGE_NOTICES'))
  with check (has_admin_permission('MANAGE_NOTICES'));

-- 문의는 같은 캠퍼스면 읽는다. 쓰는 것은 본인 이름으로만.
drop policy if exists demand_comments_read on demand_comments;
create policy demand_comments_read on demand_comments
  for select using (campus_id = current_campus_id() and deleted_at is null);

drop policy if exists demand_comments_insert on demand_comments;
create policy demand_comments_insert on demand_comments
  for insert with check (author_user_id = auth.uid() and campus_id = current_campus_id());

-- 지우기는 본인 또는 검토 권한자.
drop policy if exists demand_comments_update on demand_comments;
create policy demand_comments_update on demand_comments
  for update
  using (author_user_id = auth.uid() or has_admin_permission('REVIEW'))
  with check (author_user_id = auth.uid() or has_admin_permission('REVIEW'));

drop policy if exists demand_attachments_read on demand_attachments;
create policy demand_attachments_read on demand_attachments
  for select using (campus_id = current_campus_id());

-- 첨부는 수요를 올린 사람만 붙이고 뗀다.
drop policy if exists demand_attachments_write on demand_attachments;
create policy demand_attachments_write on demand_attachments
  for all
  using (
    exists (
      select 1 from demands d
      where d.id = demand_attachments.demand_id and d.requester_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from demands d
      where d.id = demand_attachments.demand_id and d.requester_user_id = auth.uid()
    )
  );

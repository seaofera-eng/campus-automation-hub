-- =============================================================================
-- 0011. Row Level Security 정책
--
-- ⚠️ 중요: 이 정책들은 아직 실제 Supabase 프로젝트에서 검증되지 않았습니다.
--    1단계는 DEMO 모드로 개발되었고 Supabase 연결은 2단계 작업입니다.
--    적용 전에 docs/SECURITY.md 의 "RLS 검증 절차"를 반드시 수행하세요.
--
-- 방어선은 두 겹입니다.
--   1차: 애플리케이션 (src/domain/authz/policies.ts) — 모든 서버 액션이 통과
--   2차: RLS (이 파일) — 클라이언트가 직접 PostgREST 를 호출해도 막힘
--
-- service_role 키는 RLS 를 우회합니다. 서버에서만 사용하세요.
-- =============================================================================

alter table campuses                    enable row level security;
alter table departments                 enable row level security;
alter table profiles                    enable row level security;
alter table user_roles                  enable row level security;
alter table tool_categories             enable row level security;
alter table automation_tools            enable row level security;
alter table tool_developers             enable row level security;
alter table automation_tool_versions    enable row level security;
alter table tool_tags                   enable row level security;
alter table tool_tag_relations          enable row level security;
alter table integration_systems         enable row level security;
alter table tool_integrations           enable row level security;
alter table tool_data_classifications   enable row level security;
alter table tool_costs                  enable row level security;
alter table tool_metrics                enable row level security;
alter table tool_attachments            enable row level security;
alter table tool_status_history         enable row level security;
alter table review_assignments          enable row level security;
alter table review_comments             enable row level security;
alter table risk_checklists             enable row level security;
alter table automation_demands          enable row level security;
alter table demand_matches              enable row level security;
alter table demand_participants         enable row level security;
alter table tool_evaluations            enable row level security;
alter table evaluation_history          enable row level security;
alter table improvement_requests        enable row level security;
alter table improvement_request_history enable row level security;
alter table audit_logs                  enable row level security;
alter table usage_events                enable row level security;
alter table notifications               enable row level security;

-- 2·3단계 예약 테이블도 기본 차단해 둔다.
alter table duplicate_detection_runs    enable row level security;
alter table duplicate_candidates        enable row level security;
alter table risk_assessments            enable row level security;
alter table llm_review_runs             enable row level security;
alter table llm_review_results          enable row level security;
alter table ranking_snapshots           enable row level security;
alter table reward_rules                enable row level security;
alter table developer_contributions     enable row level security;
alter table reward_ledgers              enable row level security;
alter table monthly_reward_snapshots    enable row level security;

-- -----------------------------------------------------------------------------
-- 도구 접근 판정 헬퍼
-- -----------------------------------------------------------------------------

create or replace function can_read_tool(target_tool_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from automation_tools t
    where t.id = target_tool_id
      and t.deleted_at is null
      and t.campus_id = current_campus_id()
      and (
        -- 검토자·관리자는 검토가 업무이므로 전부 볼 수 있다
        is_reviewer_or_admin()
        -- 담당자·개발자는 자기 도구를 항상 볼 수 있다
        or t.owner_user_id = auth.uid()
        or exists (select 1 from tool_developers d where d.tool_id = t.id and d.user_id = auth.uid())
        -- 그 외에는 DRAFT 가 아니면서 공개 범위에 해당해야 한다
        or (
          t.status <> 'DRAFT'
          and (
            t.visibility in ('PUBLIC', 'CAMPUS')
            or (t.visibility = 'DEPARTMENT' and t.department_id = current_department_id())
          )
        )
      )
  );
$$;

create or replace function can_write_tool(target_tool_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from automation_tools t
    where t.id = target_tool_id
      and t.deleted_at is null
      and t.campus_id = current_campus_id()
      and (
        is_admin()
        or t.owner_user_id = auth.uid()
        or exists (select 1 from tool_developers d where d.tool_id = t.id and d.user_id = auth.uid())
      )
  );
$$;

create or replace function can_read_tool_version(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from automation_tool_versions v
    where v.id = target_version_id and can_read_tool(v.tool_id)
  );
$$;

create or replace function can_write_tool_version(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from automation_tool_versions v
    where v.id = target_version_id and can_write_tool(v.tool_id)
  );
$$;

-- -----------------------------------------------------------------------------
-- 조직 · 사용자
-- -----------------------------------------------------------------------------

create policy campuses_read on campuses for select
  using (id = current_campus_id());

create policy departments_read on departments for select
  using (campus_id = current_campus_id() and deleted_at is null);

create policy departments_admin_write on departments for all
  using (is_admin() and campus_id = current_campus_id())
  with check (is_admin() and campus_id = current_campus_id());

-- 같은 캠퍼스 구성원은 서로의 이름·부서를 볼 수 있다 (담당자 표시에 필요).
create policy profiles_read on profiles for select
  using (campus_id = current_campus_id() and deleted_at is null);

create policy profiles_self_update on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_write on profiles for all
  using (is_admin() and campus_id = current_campus_id())
  with check (is_admin() and campus_id = current_campus_id());

create policy user_roles_read on user_roles for select
  using (campus_id = current_campus_id());

-- 역할 변경은 관리자만. 스스로 관리자로 승격하는 것을 막는다.
create policy user_roles_admin_write on user_roles for all
  using (is_admin() and campus_id = current_campus_id())
  with check (is_admin() and campus_id = current_campus_id() and user_id <> auth.uid());

-- -----------------------------------------------------------------------------
-- 참조 데이터
-- -----------------------------------------------------------------------------

create policy tool_categories_read on tool_categories for select
  using (campus_id = current_campus_id());

create policy tool_categories_admin_write on tool_categories for all
  using (is_admin() and campus_id = current_campus_id())
  with check (is_admin() and campus_id = current_campus_id());

create policy integration_systems_read on integration_systems for select
  using (campus_id = current_campus_id());

create policy integration_systems_admin_write on integration_systems for all
  using (is_admin() and campus_id = current_campus_id())
  with check (is_admin() and campus_id = current_campus_id());

create policy tool_tags_read on tool_tags for select
  using (campus_id = current_campus_id());

create policy tool_tags_write on tool_tags for insert
  with check (campus_id = current_campus_id());

-- -----------------------------------------------------------------------------
-- 도구
-- -----------------------------------------------------------------------------

create policy tools_read on automation_tools for select
  using (can_read_tool(id));

-- 개발자와 관리자만 새 도구를 만들 수 있고, 자기 자신을 담당자로 지정해야 한다.
create policy tools_insert on automation_tools for insert
  with check (
    campus_id = current_campus_id()
    and created_by = auth.uid()
    and (is_admin() or current_role_name() = 'DEVELOPER')
  );

create policy tools_update on automation_tools for update
  using (can_write_tool(id) or is_reviewer_or_admin())
  with check (campus_id = current_campus_id());

-- 삭제는 소프트 삭제(update)로만 한다. 물리 삭제는 관리자만.
create policy tools_delete on automation_tools for delete
  using (is_admin());

create policy tool_developers_read on tool_developers for select
  using (can_read_tool(tool_id));

create policy tool_developers_write on tool_developers for all
  using (can_write_tool(tool_id))
  with check (can_write_tool(tool_id));

create policy tool_versions_read on automation_tool_versions for select
  using (can_read_tool(tool_id));

create policy tool_versions_write on automation_tool_versions for all
  using (can_write_tool(tool_id))
  with check (can_write_tool(tool_id) and campus_id = current_campus_id());

create policy tool_tag_relations_read on tool_tag_relations for select
  using (can_read_tool(tool_id));

create policy tool_tag_relations_write on tool_tag_relations for all
  using (can_write_tool(tool_id))
  with check (can_write_tool(tool_id));

-- 버전 종속 상세 테이블은 모두 같은 규칙을 따른다.
create policy tool_integrations_read on tool_integrations for select
  using (can_read_tool_version(tool_version_id));
create policy tool_integrations_write on tool_integrations for all
  using (can_write_tool_version(tool_version_id))
  with check (can_write_tool_version(tool_version_id));

create policy tool_data_classifications_read on tool_data_classifications for select
  using (can_read_tool_version(tool_version_id));
create policy tool_data_classifications_write on tool_data_classifications for all
  using (can_write_tool_version(tool_version_id))
  with check (can_write_tool_version(tool_version_id));

create policy tool_costs_read on tool_costs for select
  using (can_read_tool_version(tool_version_id));
create policy tool_costs_write on tool_costs for all
  using (can_write_tool_version(tool_version_id))
  with check (can_write_tool_version(tool_version_id));

create policy tool_metrics_read on tool_metrics for select
  using (can_read_tool_version(tool_version_id));
create policy tool_metrics_write on tool_metrics for all
  using (can_write_tool_version(tool_version_id))
  with check (can_write_tool_version(tool_version_id));

create policy tool_attachments_read on tool_attachments for select
  using (can_read_tool_version(tool_version_id));
create policy tool_attachments_write on tool_attachments for all
  using (can_write_tool_version(tool_version_id))
  with check (can_write_tool_version(tool_version_id) and created_by = auth.uid());

-- -----------------------------------------------------------------------------
-- 워크플로 · 검토
-- -----------------------------------------------------------------------------

create policy status_history_read on tool_status_history for select
  using (can_read_tool(tool_id));

-- 이력은 추가만 가능하며, 행위자를 위조할 수 없다.
create policy status_history_insert on tool_status_history for insert
  with check (
    changed_by = auth.uid()
    and campus_id = current_campus_id()
    and (can_write_tool(tool_id) or is_reviewer_or_admin())
  );

create policy review_assignments_read on review_assignments for select
  using (is_reviewer_or_admin() or can_read_tool(tool_id));

create policy review_assignments_write on review_assignments for all
  using (is_reviewer_or_admin())
  with check (is_reviewer_or_admin() and campus_id = current_campus_id());

create policy review_comments_read on review_comments for select
  using (can_read_tool(tool_id));

create policy review_comments_insert on review_comments for insert
  with check (author_user_id = auth.uid() and is_reviewer_or_admin());

create policy risk_checklists_read on risk_checklists for select
  using (can_read_tool_version(tool_version_id));

create policy risk_checklists_write on risk_checklists for all
  using (is_reviewer_or_admin())
  with check (is_reviewer_or_admin() and reviewed_by = auth.uid());

-- -----------------------------------------------------------------------------
-- 수요
-- -----------------------------------------------------------------------------

-- DRAFT 수요는 등록자와 관리자만 볼 수 있다.
create policy demands_read on automation_demands for select
  using (
    campus_id = current_campus_id()
    and deleted_at is null
    and (status <> 'DRAFT' or requester_user_id = auth.uid() or is_admin())
  );

create policy demands_insert on automation_demands for insert
  with check (
    campus_id = current_campus_id()
    and requester_user_id = auth.uid()
    and created_by = auth.uid()
  );

create policy demands_update on automation_demands for update
  using (requester_user_id = auth.uid() or is_reviewer_or_admin())
  with check (campus_id = current_campus_id());

create policy demand_matches_read on demand_matches for select
  using (exists (select 1 from automation_demands d where d.id = demand_id and d.campus_id = current_campus_id()));

-- 요구사항 8번: 수요-도구 연결은 검토자 또는 관리자만 한다.
create policy demand_matches_write on demand_matches for all
  using (is_reviewer_or_admin())
  with check (is_reviewer_or_admin() and matched_by = auth.uid());

create policy demand_participants_read on demand_participants for select
  using (exists (select 1 from automation_demands d where d.id = demand_id and d.campus_id = current_campus_id()));

create policy demand_participants_insert on demand_participants for insert
  with check (user_id = auth.uid() and (is_admin() or current_role_name() = 'DEVELOPER'));

create policy demand_participants_delete on demand_participants for delete
  using (user_id = auth.uid() or is_admin());

-- -----------------------------------------------------------------------------
-- 평가
-- -----------------------------------------------------------------------------

create policy evaluations_read on tool_evaluations for select
  using (deleted_at is null and can_read_tool(tool_id));

-- 평가는 시범운영 또는 정식 승인 상태의 도구에만 등록할 수 있다 (요구사항 9번).
create policy evaluations_insert on tool_evaluations for insert
  with check (
    evaluator_user_id = auth.uid()
    and campus_id = current_campus_id()
    and exists (
      select 1 from automation_tools t
      where t.id = tool_id and t.status in ('PILOT', 'APPROVED')
    )
  );

-- 자기가 쓴 평가만 수정할 수 있다.
create policy evaluations_update on tool_evaluations for update
  using (evaluator_user_id = auth.uid() or is_admin())
  with check (evaluator_user_id = auth.uid() or is_admin());

create policy evaluation_history_read on evaluation_history for select
  using (exists (select 1 from tool_evaluations e where e.id = evaluation_id and can_read_tool(e.tool_id)));

create policy evaluation_history_insert on evaluation_history for insert
  with check (changed_by = auth.uid());

-- -----------------------------------------------------------------------------
-- 개선 요청
-- -----------------------------------------------------------------------------

create policy improvements_read on improvement_requests for select
  using (deleted_at is null and can_read_tool(tool_id));

create policy improvements_insert on improvement_requests for insert
  with check (
    campus_id = current_campus_id()
    and requester_user_id = auth.uid()
    and created_by = auth.uid()
  );

create policy improvements_update on improvement_requests for update
  using (
    requester_user_id = auth.uid()
    or assigned_developer_user_id = auth.uid()
    or can_write_tool(tool_id)
    or is_reviewer_or_admin()
  )
  with check (campus_id = current_campus_id());

create policy improvement_history_read on improvement_request_history for select
  using (exists (
    select 1 from improvement_requests r
    where r.id = improvement_request_id and can_read_tool(r.tool_id)
  ));

create policy improvement_history_insert on improvement_request_history for insert
  with check (changed_by = auth.uid());

-- -----------------------------------------------------------------------------
-- 감사 로그 · 사용 이벤트 · 알림
-- -----------------------------------------------------------------------------

-- 감사 로그 조회는 관리자만. 관리자 자신의 작업도 로그에서 제외되지 않는다.
create policy audit_logs_admin_read on audit_logs for select
  using (is_admin() and campus_id = current_campus_id());

-- 로그 기록은 서버(service_role)가 담당한다. 클라이언트 직접 삽입은 허용하지 않는다.
-- 정책을 만들지 않으면 insert 가 전부 거부된다.

create policy usage_events_admin_read on usage_events for select
  using (is_admin() and campus_id = current_campus_id());

create policy usage_events_insert on usage_events for insert
  with check (campus_id = current_campus_id() and (user_id = auth.uid() or user_id is null));

create policy notifications_read on notifications for select
  using (recipient_user_id = auth.uid());

create policy notifications_update on notifications for update
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2·3단계 예약 테이블
-- 읽기는 관리자만 허용하고, 쓰기는 서버(service_role)로만 한다.
-- 기능이 실제로 켜질 때 정책을 다시 설계한다.
-- -----------------------------------------------------------------------------

create policy duplicate_runs_admin_read on duplicate_detection_runs for select using (is_admin());
create policy duplicate_candidates_admin_read on duplicate_candidates for select using (is_admin());
create policy risk_assessments_read on risk_assessments for select using (is_reviewer_or_admin());
create policy llm_review_runs_admin_read on llm_review_runs for select using (is_admin());
create policy llm_review_results_admin_read on llm_review_results for select using (is_admin());
create policy ranking_snapshots_read on ranking_snapshots for select using (campus_id = current_campus_id());
create policy reward_rules_read on reward_rules for select using (campus_id = current_campus_id());
create policy contributions_read on developer_contributions for select
  using (developer_id = auth.uid() or is_admin());
create policy reward_ledgers_read on reward_ledgers for select
  using (developer_id = auth.uid() or is_admin());
create policy reward_snapshots_admin_read on monthly_reward_snapshots for select using (is_admin());

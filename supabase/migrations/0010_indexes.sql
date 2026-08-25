-- =============================================================================
-- 0010. 인덱스
-- 목록 화면의 검색·필터·정렬 경로를 기준으로 만든다.
-- =============================================================================

-- 도구 목록: 캠퍼스 + 상태 + 최신순
create index if not exists idx_tools_campus_status
  on automation_tools (campus_id, status, updated_at desc)
  where deleted_at is null;

create index if not exists idx_tools_category on automation_tools (category_id) where deleted_at is null;
create index if not exists idx_tools_department on automation_tools (department_id) where deleted_at is null;
create index if not exists idx_tools_owner on automation_tools (owner_user_id) where deleted_at is null;

-- 한국어 키워드 검색.
-- Postgres 기본 사전은 한국어 형태소를 다루지 못하므로 trigram 을 쓴다.
-- (pg_bigm 이나 형태소 분석기를 도입하면 이 인덱스를 교체하면 된다.)
create extension if not exists pg_trgm;

create index if not exists idx_tools_name_trgm
  on automation_tools using gin (name gin_trgm_ops);

create index if not exists idx_tools_summary_trgm
  on automation_tools using gin (summary gin_trgm_ops);

create index if not exists idx_tool_versions_tool
  on automation_tool_versions (tool_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_tool_versions_description_trgm
  on automation_tool_versions using gin (description gin_trgm_ops);

-- 데이터 분류 필터
create index if not exists idx_tool_data_classifications_lookup
  on tool_data_classifications (classification, in_use, tool_version_id);

create index if not exists idx_tool_integrations_version
  on tool_integrations (tool_version_id);

-- 상태 이력 · 검토
create index if not exists idx_status_history_tool
  on tool_status_history (tool_id, changed_at desc);

create index if not exists idx_review_assignments_reviewer
  on review_assignments (reviewer_user_id, status, assigned_at desc);

create index if not exists idx_review_assignments_version
  on review_assignments (tool_version_id);

create index if not exists idx_review_comments_tool
  on review_comments (tool_id, created_at desc);

-- 수요
create index if not exists idx_demands_campus_status
  on automation_demands (campus_id, status, updated_at desc)
  where deleted_at is null;

create index if not exists idx_demands_requester
  on automation_demands (requester_user_id)
  where deleted_at is null;

create index if not exists idx_demands_title_trgm
  on automation_demands using gin (title gin_trgm_ops);

create index if not exists idx_demand_matches_demand on demand_matches (demand_id);
create index if not exists idx_demand_matches_tool on demand_matches (tool_id);
create index if not exists idx_demand_participants_demand on demand_participants (demand_id);

-- 평가
create index if not exists idx_evaluations_tool
  on tool_evaluations (tool_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_evaluations_evaluator
  on tool_evaluations (evaluator_user_id)
  where deleted_at is null;

-- 개선 요청
create index if not exists idx_improvements_campus_status
  on improvement_requests (campus_id, status, created_at desc)
  where deleted_at is null;

create index if not exists idx_improvements_tool
  on improvement_requests (tool_id, status)
  where deleted_at is null;

create index if not exists idx_improvements_assignee
  on improvement_requests (assigned_developer_user_id)
  where deleted_at is null;

-- 감사 로그 (관리자 화면의 필터 조합)
create index if not exists idx_audit_logs_campus_created
  on audit_logs (campus_id, created_at desc);

create index if not exists idx_audit_logs_actor on audit_logs (actor_user_id, created_at desc);
create index if not exists idx_audit_logs_target on audit_logs (target_type, target_id);
create index if not exists idx_audit_logs_action on audit_logs (action, created_at desc);

-- 사용 이벤트 · 알림
create index if not exists idx_usage_events_tool on usage_events (tool_id, occurred_at desc);

create index if not exists idx_notifications_recipient
  on notifications (recipient_user_id, read_at, created_at desc);

-- 사용자 조회
create index if not exists idx_profiles_campus on profiles (campus_id) where deleted_at is null;
create index if not exists idx_user_roles_user on user_roles (user_id);

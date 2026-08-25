-- =============================================================================
-- 0001. 확장 기능과 열거형
-- 캠퍼스 자동화 관제 플랫폼 — 1단계 MVP
--
-- ⚠️ 이 마이그레이션은 아직 실제 Supabase 프로젝트에 적용되지 않았습니다.
--    적용 전에 docs/SECURITY.md 의 "RLS 검증 절차"를 반드시 수행하세요.
-- =============================================================================

create extension if not exists pgcrypto;

-- 역할 (요구사항 5번)
do $$ begin
  create type user_role as enum ('REQUESTER', 'DEVELOPER', 'REVIEWER', 'ADMIN');
exception when duplicate_object then null; end $$;

-- 도구 상태 (요구사항 7번)
-- AI_REVIEW 는 2단계용으로 미리 정의만 해 두고 1단계에서는 사용하지 않는다.
do $$ begin
  create type tool_status as enum (
    'DRAFT', 'SUBMITTED', 'AI_REVIEW', 'HUMAN_REVIEW', 'REVISION_REQUIRED',
    'PILOT', 'APPROVED', 'SUSPENDED', 'RETIRED'
  );
exception when duplicate_object then null; end $$;

-- 수요 상태 (요구사항 8번)
do $$ begin
  create type demand_status as enum (
    'DRAFT', 'OPEN', 'MATCHED', 'IN_DEVELOPMENT', 'PILOT', 'COMPLETED', 'CLOSED'
  );
exception when duplicate_object then null; end $$;

-- 개선 요청 상태 (요구사항 9번)
do $$ begin
  create type improvement_status as enum (
    'OPEN', 'REVIEWING', 'ACCEPTED', 'IN_PROGRESS', 'RELEASED', 'REJECTED', 'CLOSED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type improvement_type as enum (
    'BUG_FIX', 'NEW_FEATURE', 'INTEGRATION', 'USABILITY', 'SECURITY', 'COST', 'DOCUMENTATION'
  );
exception when duplicate_object then null; end $$;

-- 자동화 수준 (요구사항 6번)
do $$ begin
  create type automation_level as enum ('AI_ASSISTED', 'HUMAN_IN_THE_LOOP', 'FULLY_AUTOMATED');
exception when duplicate_object then null; end $$;

-- 위험도 (요구사항 15번)
do $$ begin
  create type risk_level as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
exception when duplicate_object then null; end $$;

-- 수요-도구 연결 유형 (요구사항 8번)
do $$ begin
  create type match_type as enum (
    'READY_TO_USE', 'NEEDS_CONFIGURATION', 'NEEDS_IMPROVEMENT',
    'NEEDS_COMBINATION', 'NEEDS_NEW_DEVELOPMENT'
  );
exception when duplicate_object then null; end $$;

-- 공개 범위
do $$ begin
  create type visibility_scope as enum ('PUBLIC', 'CAMPUS', 'DEPARTMENT', 'PRIVATE');
exception when duplicate_object then null; end $$;

-- 데이터 분류 (요구사항 6번 보안·데이터 정보)
do $$ begin
  create type data_classification as enum (
    'PUBLIC', 'INTERNAL', 'PERSONAL', 'ACADEMIC',
    'GRADE', 'COUNSELING', 'RESEARCH', 'FINANCIAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type attachment_kind as enum (
    'COVER_IMAGE', 'USER_MANUAL', 'TEST_RESULT', 'SECURITY_REVIEW', 'OTHER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_assignment_status as enum ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_comment_kind as enum ('GENERAL', 'REVISION_REQUEST', 'APPROVAL_OPINION');
exception when duplicate_object then null; end $$;

do $$ begin
  create type work_frequency as enum ('DAILY', 'WEEKLY', 'MONTHLY', 'SEMESTERLY', 'IRREGULAR');
exception when duplicate_object then null; end $$;

do $$ begin
  create type impact_level as enum ('LOW', 'MEDIUM', 'HIGH');
exception when duplicate_object then null; end $$;

do $$ begin
  create type participant_role as enum ('DEVELOPER', 'ADVISOR');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 공통 트리거: updated_at 자동 갱신
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

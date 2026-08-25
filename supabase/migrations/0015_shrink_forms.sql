-- -----------------------------------------------------------------------------
-- 등록 폼에서 안 쓰는 항목을 걷어낸다.
--
-- 리뷰 4.3절: "작성해야 하는 내용이 너무 많음. 불필요한 항목을 줄여야 함."
--   · [비용과 성과]는 전체 삭제
--   · [연동 시스템] 삭제 — 일반인이 학내 시스템에 접근할 수 없고, 해서도 안 된다
--   · [도구 설명] 삭제 — 한 줄 소개와 해결하려는 문제로 충분하다
--   · [월 예상 사용 횟수] 삭제
-- 리뷰 6.4절: 수요의 [사용 중인 시스템] 삭제, 희망 수여 토큰 추가,
--             개인정보 체크를 식별 가능/불가능으로 분리
-- 리뷰 7절:   평가 7항목 → 종합 만족도 하나
--
-- 이 저장소의 마이그레이션은 아직 실제 Supabase 프로젝트에 적용된 적이 없다.
-- 적용 전 docs/SECURITY.md 의 RLS 검증 체크리스트를 먼저 밟을 것.
-- -----------------------------------------------------------------------------

-- 1) 도구 버전 ---------------------------------------------------------------

alter table tool_versions
  drop column if exists description,
  drop column if exists monthly_expected_usage,
  drop column if exists other_integration_note;

drop table if exists tool_integrations cascade;
drop table if exists integration_systems cascade;
drop table if exists tool_costs cascade;
drop table if exists tool_metrics cascade;

-- 2) 카테고리 설명은 유지한다 --------------------------------------------------
--
-- 관리 화면에서 "이 분류가 무엇인지"를 적어 두는 자리라 남긴다.

alter table tool_categories
  add column if not exists description text not null default '';

-- 3) 수요 -------------------------------------------------------------------

alter table demands drop column if exists systems_in_use;

-- 개인정보를 "포함한다/아니다"로만 물으면, 통계처럼 이미 합쳐진 숫자를 다루는
-- 경우까지 같은 등급으로 검토하게 된다. 둘을 나눠 받는다.
alter table demands
  add column if not exists contains_identifiable_personal_data boolean not null default false,
  add column if not exists contains_anonymized_personal_data boolean not null default false;

update demands
set contains_identifiable_personal_data = contains_personal_data
where contains_personal_data is not null;

alter table demands drop column if exists contains_personal_data;

-- 수요를 해결해 준 사람에게 주고 싶은 토큰. 실제 지급은 reward_ledgers 가 맡는다.
alter table demands
  add column if not exists offered_tokens integer
  check (offered_tokens is null or offered_tokens >= 0);

comment on column demands.offered_tokens is
  '완성한 개발자에게 주고 싶은 토큰. 수요자가 도구 하나를 골라 수여한다.';

-- 4) 참여 신청 ---------------------------------------------------------------
--
-- 참여 형태(개발자/자문)를 나누지 않는다. 메시지도 선택으로 바꾼다.

alter table demand_participants alter column message drop not null;
alter table demand_participants alter column message set default '';

-- 5) 평가 -------------------------------------------------------------------
--
-- 종합 만족도 하나만 남긴다. 일곱 항목을 다 채우는 부담 때문에 평가 자체를
-- 하지 않게 되는 것보다, 점수 하나와 한 문장을 받는 편이 낫다.

alter table evaluations
  drop column if exists problem_solving,
  drop column if exists work_efficiency,
  drop column if exists usability,
  drop column if exists stability,
  drop column if exists accuracy,
  drop column if exists spread_potential;

alter table evaluation_history
  drop column if exists previous_problem_solving,
  drop column if exists previous_work_efficiency,
  drop column if exists previous_usability,
  drop column if exists previous_stability,
  drop column if exists previous_accuracy,
  drop column if exists previous_spread_potential;

-- 평가는 익명으로 보여준다. 작성자는 저장하되 (중복 방지·본인 수정) 화면에는
-- 내보내지 않는다. 애플리케이션이 이름을 붙이지 않으므로 컬럼은 그대로 둔다.
comment on column evaluations.evaluator_user_id is
  '중복 방지와 본인 수정에만 쓴다. 화면에는 작성자를 표시하지 않는다.';

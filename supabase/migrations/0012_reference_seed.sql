-- =============================================================================
-- 0012. 참조 데이터 시드
--
-- 카테고리와 연동 시스템 목록입니다. 데모 데이터가 아니라 실제 운영에서도
-- 쓰이는 마스터 값이며, 필요에 따라 관리자 화면에서 수정할 수 있습니다.
--
-- 사용자·도구·수요 같은 업무 데이터는 여기에 넣지 않습니다.
-- 데모 데이터는 DEMO 모드의 src/repositories/demo/seed.ts 에만 존재합니다.
-- =============================================================================

-- 캠퍼스가 하나도 없을 때만 기본 캠퍼스를 만든다.
insert into campuses (id, name, short_name)
select gen_random_uuid(), '본교', '본교'
where not exists (select 1 from campuses);

do $$
declare
  v_campus_id uuid;
begin
  select id into v_campus_id from campuses order by created_at limit 1;

  -- 카테고리 -----------------------------------------------------------------
  insert into tool_categories (campus_id, code, name, description, sort_order)
  values
    (v_campus_id, 'DOC_MEETING', '문서·회의', '회의록, 보고서, 공문 등 문서 작성과 정리를 돕는 도구', 1),
    (v_campus_id, 'DATA_AGG',    '데이터 취합', '여러 부서·학과의 자료를 모으고 정리하는 도구', 2),
    (v_campus_id, 'COMM',        '커뮤니케이션', '이메일, 안내문, 공지 작성과 발송을 돕는 도구', 3),
    (v_campus_id, 'SEARCH',      '정보 검색', '규정, 지침, 자료를 찾아주는 검색·질의응답 도구', 4),
    (v_campus_id, 'ROUTING',     '분류·라우팅', '문의나 민원을 분류해 담당 부서로 전달하는 도구', 5),
    (v_campus_id, 'RESEARCH',    '연구지원', '연구과제 공고, 연구비, 실적 관리를 돕는 도구', 6)
  on conflict (campus_id, code) do nothing;

  -- 연동 시스템 --------------------------------------------------------------
  -- is_external 은 향후 위험 평가에서 "외부 전송" 판단에 쓰인다.
  insert into integration_systems (campus_id, code, name, is_external, sort_order)
  values
    (v_campus_id, 'EMAIL',         '이메일',         false, 1),
    (v_campus_id, 'CALENDAR',      '캘린더',         false, 2),
    (v_campus_id, 'LMS',           'LMS',            false, 3),
    (v_campus_id, 'ACADEMIC',      '학사정보시스템', false, 4),
    (v_campus_id, 'RESEARCH_MGMT', '연구관리시스템', false, 5),
    (v_campus_id, 'APPROVAL',      '전자결재',       false, 6),
    (v_campus_id, 'FILE_STORAGE',  '파일 저장소',    false, 7),
    (v_campus_id, 'EXTERNAL_API',  '외부 API',       true,  8)
  on conflict (campus_id, code) do nothing;
end $$;

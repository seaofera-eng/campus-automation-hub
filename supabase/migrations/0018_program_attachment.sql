-- 프로그램 파일 첨부 (리뷰 2026-08-27 3절)
--
-- "가장 치명적인 것은 자동화 도구를 올릴 수가 없음. 파일이든, URL이든
--  연결시켜야하는데 그것을 넣을 수 있는 칸이 없음."
--
-- 주소(service_url · repository_url)는 이미 tool_versions 에 있었다. 없던 것은
-- **받아서 돌리는 파일**을 담을 자리다. 엑셀 매크로처럼 웹 주소가 아예 없는
-- 도구가 학내에 제일 많은데, 그런 도구는 올릴 방법이 없었다.
--
-- enum 값 추가는 되돌릴 수 없다(PostgreSQL 은 enum 값 삭제를 지원하지 않는다).
-- 그래도 별도 테이블을 만들지 않은 이유는, 이것이 새로운 종류의 첨부일 뿐
-- 새로운 개념이 아니기 때문이다. 사용설명서와 같은 자리에 종류만 다르게 붙는다.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'attachment_kind' and e.enumlabel = 'PROGRAM'
  ) then
    -- 목록 맨 앞에 둔다. 화면에서도 첫 선택지다 — 이 화면에 오는 가장 큰 이유다.
    alter type attachment_kind add value 'PROGRAM' before 'COVER_IMAGE';
  end if;
end $$;

comment on type attachment_kind is
  '첨부 종류. PROGRAM 은 받아서 실행하는 파일(zip·xlsm)이며, 도구를 실제로 쓸 수 있는 수단 중 하나다.';

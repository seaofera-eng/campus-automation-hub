import { describe, expect, it } from 'vitest';
import { availableAccess, hasUsableAccess } from '@/domain/tool/types';
import { ALLOWED_ATTACHMENT_TYPES } from '@/lib/validation/attachment';
import { nextVersionLabel } from '@/application/tools/register';

/**
 * 도구를 실제로 쓸 수 있는가 (리뷰 2026-08-27 3절).
 *
 * "가장 치명적인 것은 자동화 도구를 올릴 수가 없음."
 *
 * 설명만 있고 실체가 없는 도구는 카탈로그가 아니라 목록일 뿐이다.
 */

const NONE = { serviceUrl: '', repositoryUrl: '', hasProgramFile: false };

describe('쓸 수 있는 방법 판정', () => {
  it('아무것도 없으면 등록 신청을 받지 않는다', () => {
    expect(hasUsableAccess(NONE)).toBe(false);
    expect(availableAccess(NONE)).toEqual([]);
  });

  it('공백만 있는 주소는 없는 것으로 본다', () => {
    // 스페이스 하나로 검증을 통과하면 막는 의미가 없다.
    expect(hasUsableAccess({ ...NONE, serviceUrl: '   ' })).toBe(false);
    expect(hasUsableAccess({ ...NONE, repositoryUrl: '\t' })).toBe(false);
  });

  it('셋 중 하나만 있어도 된다', () => {
    expect(hasUsableAccess({ ...NONE, serviceUrl: 'https://a.test' })).toBe(true);
    expect(hasUsableAccess({ ...NONE, hasProgramFile: true })).toBe(true);
    expect(hasUsableAccess({ ...NONE, repositoryUrl: 'https://git.test/x' })).toBe(true);
  });

  it('바로 쓸 수 있는 것부터 앞에 온다', () => {
    // 화면이 이 순서대로 버튼을 그린다. 소스 저장소가 맨 앞에 오면 안 된다.
    expect(
      availableAccess({
        serviceUrl: 'https://a.test',
        repositoryUrl: 'https://git.test/x',
        hasProgramFile: true,
      }),
    ).toEqual(['SERVICE', 'PROGRAM', 'REPOSITORY']);
  });
});

describe('첨부 허용 형식', () => {
  it('프로그램을 올릴 수 있다', () => {
    expect(ALLOWED_ATTACHMENT_TYPES['application/zip']).toBe('zip');
    expect(ALLOWED_ATTACHMENT_TYPES['application/vnd.ms-excel.sheet.macroEnabled.12']).toBe('xlsm');
  });

  it('실행 파일을 그대로 올릴 수는 없다', () => {
    // octet-stream 을 열면 exe 가 그대로 통과한다. 압축해서 올리게 한다.
    expect(ALLOWED_ATTACHMENT_TYPES['application/octet-stream']).toBeUndefined();
    expect(ALLOWED_ATTACHMENT_TYPES['application/x-msdownload']).toBeUndefined();
    expect(ALLOWED_ATTACHMENT_TYPES['application/x-msdos-program']).toBeUndefined();
  });

  it('SVG 는 여전히 막는다', () => {
    // 스크립트를 품을 수 있다. 프로그램 파일을 열었다고 함께 열리면 안 된다.
    expect(ALLOWED_ATTACHMENT_TYPES['image/svg+xml']).toBeUndefined();
  });
});

describe('버전 번호', () => {
  it('뒷자리를 올린다', () => {
    expect(nextVersionLabel('v1.0')).toBe('v1.1');
    expect(nextVersionLabel('v2.9')).toBe('v2.10');
  });

  it('v 없이 적어도 알아본다', () => {
    expect(nextVersionLabel('1.0')).toBe('v1.1');
  });

  it('규칙에 안 맞으면 원래 이름을 살린다', () => {
    // 사람이 정한 이름을 버리지 않는다.
    expect(nextVersionLabel('베타')).toBe('베타-수정');
    expect(nextVersionLabel('')).toBe('v1.1');
  });
});

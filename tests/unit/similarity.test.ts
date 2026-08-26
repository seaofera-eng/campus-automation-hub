import { describe, expect, it } from 'vitest';
import {
  compareLexically,
  jaccard,
  normalize,
  shortlistCandidates,
  trigrams,
  type SimilarityInput,
} from '@/domain/similarity';

function tool(overrides: Partial<SimilarityInput> & { id: string }): SimilarityInput {
  return {
    name: '',
    problemStatement: '',
    keyFeatures: [],
    inputData: '',
    outputData: '',
    categoryName: '기타',
    tags: [],
    ...overrides,
  };
}

describe('normalize', () => {
  it('띄어쓰기가 달라도 같은 글자가 된다', () => {
    expect(normalize('회의록 요약')).toBe(normalize('회의록요약'));
  });

  it('문장부호와 대소문자를 지운다', () => {
    expect(normalize('Excel-정리(자동)!')).toBe('excel정리자동');
  });
});

describe('trigrams', () => {
  it('세 글자씩 자른다', () => {
    expect([...trigrams('회의록요약')]).toEqual(['회의록', '의록요', '록요약']);
  });

  it('세 글자 이하는 통째로 남긴다 — 버리면 이름 짧은 도구가 샌다', () => {
    expect([...trigrams('요약')]).toEqual(['요약']);
  });

  it('빈 문자열은 빈 집합', () => {
    expect(trigrams('   !!  ').size).toBe(0);
  });
});

describe('jaccard', () => {
  it('완전히 같으면 100', () => {
    expect(jaccard(trigrams('회의록 요약'), trigrams('회의록요약'))).toBe(100);
  });

  it('겹치는 것이 없으면 0', () => {
    expect(jaccard(trigrams('회의록요약'), trigrams('출석부정리'))).toBe(0);
  });

  it('한쪽이 비면 0 — 나누기 오류를 내지 않는다', () => {
    expect(jaccard(trigrams(''), trigrams('회의록요약'))).toBe(0);
  });

  it('부분적으로 겹치면 0 과 100 사이', () => {
    const score = jaccard(trigrams('학사일정안내'), trigrams('학사일정조회'));
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe('compareLexically', () => {
  it('문제 설명이 겹치면 이름만 겹칠 때보다 높게 나온다', () => {
    const source = tool({
      id: 'a',
      name: '회의록 요약기',
      problemStatement: '회의 녹취를 사람이 직접 듣고 정리하느라 시간이 오래 걸립니다',
    });

    const sameProblem = tool({
      id: 'b',
      name: '전혀 다른 이름',
      problemStatement: '회의 녹취를 사람이 직접 듣고 정리하느라 시간이 오래 걸립니다',
    });

    const sameName = tool({ id: 'c', name: '회의록 요약기', problemStatement: '' });

    expect(compareLexically(source, sameProblem).overall).toBeGreaterThan(
      compareLexically(source, sameName).overall,
    );
  });

  it('같은 분류인지 함께 알려 준다', () => {
    const source = tool({ id: 'a', categoryName: '학사' });
    expect(compareLexically(source, tool({ id: 'b', categoryName: '학사' })).sameCategory).toBe(true);
    expect(compareLexically(source, tool({ id: 'c', categoryName: '연구' })).sameCategory).toBe(false);
  });

  it('겹치는 글자가 없어도 음수나 100 초과가 나오지 않는다', () => {
    const result = compareLexically(
      tool({ id: 'a', name: '가나다', problemStatement: '라마바' }),
      tool({ id: 'b', name: 'xyz', problemStatement: 'qwe' }),
    );
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});

describe('shortlistCandidates', () => {
  const source = tool({
    id: 'source',
    name: '회의록 요약',
    problemStatement: '회의 녹취를 듣고 정리하는 데 시간이 오래 걸립니다',
    keyFeatures: ['녹취 자동 요약', '담당자별 할 일 추출'],
    categoryName: '행정',
  });

  const pool = [
    source,
    tool({
      id: 'near',
      name: '회의록 자동 정리',
      problemStatement: '회의 녹취를 듣고 정리하는 데 시간이 오래 걸립니다',
      keyFeatures: ['녹취 자동 요약'],
      categoryName: '행정',
    }),
    tool({ id: 'far', name: '실험실 장비 예약', problemStatement: '장비 예약이 전화로만 됩니다', categoryName: '연구' }),
    tool({ id: 'far2', name: '주차 정산 확인', problemStatement: '주차 정산을 수기로 합니다', categoryName: '시설' }),
  ];

  it('자기 자신은 후보에서 뺀다', () => {
    expect(shortlistCandidates(source, pool).map((entry) => entry.candidateId)).not.toContain('source');
  });

  it('가장 비슷한 것을 맨 앞에 둔다', () => {
    expect(shortlistCandidates(source, pool)[0]?.candidateId).toBe('near');
  });

  it('요청한 개수만큼만 남긴다 — 모델 호출 비용이 여기서 정해진다', () => {
    expect(shortlistCandidates(source, pool, 2)).toHaveLength(2);
  });

  it('점수가 엇비슷하면 같은 분류를 앞세운다', () => {
    const plain = tool({ id: 'source2', name: '가가가', categoryName: '행정' });
    const ranked = shortlistCandidates(plain, [
      plain,
      tool({ id: 'other-category', name: '나나나', categoryName: '연구' }),
      tool({ id: 'same-category', name: '다다다', categoryName: '행정' }),
    ]);
    expect(ranked[0]?.candidateId).toBe('same-category');
  });

  it('후보가 없으면 빈 배열', () => {
    expect(shortlistCandidates(source, [source])).toEqual([]);
  });
})

/**
 * 글자 겹침으로 비슷한 도구를 **추려 내는** 계산.
 *
 * ## 왜 이게 필요한가
 *
 * 도구가 200개면 새 도구 하나를 등록할 때 199번을 모델에게 물어봐야 한다.
 * 비용도 시간도 감당이 안 된다. 그래서 두 단계로 나눈다.
 *
 * 1. **여기** — 모든 도구와 글자 겹침을 계산해 상위 몇 개만 남긴다. 공짜고 즉시다.
 * 2. 남은 몇 개만 모델에게 보내 "정말 중복이냐"를 묻는다.
 *
 * ## 여기서 나온 숫자는 중복 점수가 아니다
 *
 * 글자가 얼마나 겹치는지일 뿐이다. "회의록 요약"과 "미팅 노트 정리"는
 * 하는 일이 같아도 글자는 거의 안 겹친다. 반대로 "학사 일정 안내"와
 * "학사 일정 조회"는 글자가 많이 겹쳐도 다른 도구다.
 *
 * 그래서 이 값은 **후보를 좁히는 데만** 쓰고 화면에 중복도로 내보이지 않는다.
 * 판단은 모델이, 확정은 사람이 한다.
 */

/** 비교에 쓸 도구 한 건. 도메인 타입에 묶이지 않게 필요한 것만 받는다. */
export interface SimilarityInput {
  id: string;
  name: string;
  problemStatement: string;
  keyFeatures: readonly string[];
  inputData: string;
  outputData: string;
  categoryName: string;
  tags: readonly string[];
}

/**
 * 비교할 때 글자를 고르게 만든다.
 *
 * 한글은 띄어쓰기가 사람마다 달라서("회의록요약" / "회의록 요약") 공백을 지운다.
 * 조사와 어미까지 떼려면 형태소 분석이 필요한데, 글자 3-gram 이 그 차이를
 * 어느 정도 흡수하므로 여기서는 하지 않는다.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    // 한글·영문·숫자만 남긴다. 문장부호는 사람마다 다르게 쓴다.
    .replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-z0-9]/g, '');
}

/**
 * 글자 3개씩 잘라 집합으로 만든다.
 *
 * 한국어는 영어처럼 공백으로 단어를 가를 수 없어서 단어 단위 비교가 잘 안 된다.
 * 글자 단위로 자르면 "회의록"과 "회의록을"이 두 조각을 공유한다.
 */
export function trigrams(text: string): Set<string> {
  const normalized = normalize(text);
  const result = new Set<string>();

  // 3글자가 안 되는 짧은 말은 통째로 한 조각으로 둔다. 버리면 이름이 짧은 도구가 샌다.
  if (normalized.length === 0) return result;
  if (normalized.length <= 3) {
    result.add(normalized);
    return result;
  }

  for (let index = 0; index + 3 <= normalized.length; index += 1) {
    result.add(normalized.slice(index, index + 3));
  }
  return result;
}

/**
 * 두 집합이 얼마나 겹치는지. 0~100.
 *
 * 자카드 계수를 쓴다 — 겹친 조각 수를 전체 조각 수로 나눈다.
 * 한쪽이 길면 값이 낮아지는데, 그건 실제로 다른 도구일 가능성이 높다는 뜻이라
 * 그대로 둔다.
 */
export function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  // 작은 쪽을 돈다. 큰 쪽을 돌면 도구가 늘수록 느려진다.
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  for (const gram of smaller) {
    if (larger.has(gram)) shared += 1;
  }

  const union = left.size + right.size - shared;
  return union === 0 ? 0 : Math.round((shared / union) * 1000) / 10;
}

/**
 * 왼쪽 조각이 오른쪽에 얼마나 들어 있는가 (0~100).
 *
 * ## Jaccard 와 무엇이 다른가
 *
 * Jaccard 는 분모가 **합집합**이라 두 글이 길이가 다르면 점수가 깎인다.
 * 도구끼리 비교할 때는 그게 맞다 — 둘 다 비슷한 분량의 설명이고, 한쪽에만
 * 잔뜩 있는 내용은 "다른 도구"라는 신호다.
 *
 * 마법사는 사정이 다르다. 사람이 고른 것은 낱말 몇 개고 도구 설명은 문단
 * 몇 개다. 정확히 맞는 도구를 골라도 Jaccard 는 2점밖에 안 준다. 실제로
 * 이것 때문에 추천이 0건이었다.
 *
 * 그래서 여기서 묻는 것은 다르다 — **내가 찾는 것이 이 도구에 들어 있는가.**
 * 분모가 왼쪽(질의)뿐이라 도구 설명이 길어도 벌점이 없다.
 */
export function containment(query: Set<string>, target: Set<string>): number {
  if (query.size === 0 || target.size === 0) return 0;

  let shared = 0;
  for (const gram of query) {
    if (target.has(gram)) shared += 1;
  }

  return Math.round((shared / query.size) * 1000) / 10;
}

/** 글자로 비교한 항목별 결과. */
export interface LexicalOverlap {
  candidateId: string;
  /** 항목별 점수를 가중 평균한 값. 0~100. **중복도가 아니다.** */
  overall: number;
  byField: {
    name: number;
    problemStatement: number;
    keyFeatures: number;
    inputOutput: number;
    tags: number;
  };
  /** 같은 분류에 속하는가. 점수와 별개로 후보를 고를 때 함께 본다. */
  sameCategory: boolean;
}

/**
 * 항목별 가중치.
 *
 * "무엇을 해결하려는 도구인가"가 중복 판단의 핵심이라 문제 설명에 제일 무게를 둔다.
 * 이름은 같은 일을 해도 제각각이라 낮게 둔다.
 */
const FIELD_WEIGHTS = {
  name: 0.15,
  problemStatement: 0.35,
  keyFeatures: 0.25,
  inputOutput: 0.15,
  tags: 0.1,
} as const;

function overlapOf(left: string, right: string): number {
  return jaccard(trigrams(left), trigrams(right));
}

function containmentOf(query: string, target: string): number {
  return containment(trigrams(query), trigrams(target));
}

/**
 * 찾는 내용이 도구에 얼마나 들어 있는가.
 *
 * 길이가 크게 다른 둘을 비교할 때 쓴다 — 마법사에서 고른 낱말 몇 개와
 * 도구 설명 문단 몇 개처럼. `compareLexically` 와 결과 모양은 같지만
 * **묻는 질문이 다르다**: "둘이 비슷한가"가 아니라 "내가 찾는 게 여기 있는가".
 *
 * 도구끼리 중복을 볼 때는 쓰지 않는다. 짧은 설명 하나가 긴 설명 안에 모두
 * 들어 있다고 해서 같은 도구인 것은 아니기 때문이다.
 */
export function searchLexically(
  query: SimilarityInput,
  candidate: SimilarityInput,
): LexicalOverlap {
  const byField = {
    name: containmentOf(query.name, candidate.name),
    problemStatement: containmentOf(query.problemStatement, candidate.problemStatement),
    keyFeatures: containmentOf(query.keyFeatures.join(' '), candidate.keyFeatures.join(' ')),
    inputOutput: containmentOf(
      `${query.inputData} ${query.outputData}`,
      `${candidate.inputData} ${candidate.outputData}`,
    ),
    tags: containmentOf(query.tags.join(' '), candidate.tags.join(' ')),
  };

  const overall =
    byField.name * FIELD_WEIGHTS.name +
    byField.problemStatement * FIELD_WEIGHTS.problemStatement +
    byField.keyFeatures * FIELD_WEIGHTS.keyFeatures +
    byField.inputOutput * FIELD_WEIGHTS.inputOutput +
    byField.tags * FIELD_WEIGHTS.tags;

  return {
    candidateId: candidate.id,
    overall: Math.round(overall * 10) / 10,
    byField,
    sameCategory:
      query.categoryName !== '' && query.categoryName === candidate.categoryName,
  };
}

/** 도구 두 건의 글자 겹침. */
export function compareLexically(
  source: SimilarityInput,
  candidate: SimilarityInput,
): LexicalOverlap {
  const byField = {
    name: overlapOf(source.name, candidate.name),
    problemStatement: overlapOf(source.problemStatement, candidate.problemStatement),
    keyFeatures: overlapOf(source.keyFeatures.join(' '), candidate.keyFeatures.join(' ')),
    inputOutput: overlapOf(
      `${source.inputData} ${source.outputData}`,
      `${candidate.inputData} ${candidate.outputData}`,
    ),
    tags: overlapOf(source.tags.join(' '), candidate.tags.join(' ')),
  };

  const overall =
    byField.name * FIELD_WEIGHTS.name +
    byField.problemStatement * FIELD_WEIGHTS.problemStatement +
    byField.keyFeatures * FIELD_WEIGHTS.keyFeatures +
    byField.inputOutput * FIELD_WEIGHTS.inputOutput +
    byField.tags * FIELD_WEIGHTS.tags;

  return {
    candidateId: candidate.id,
    overall: Math.round(overall * 10) / 10,
    byField,
    sameCategory: source.categoryName === candidate.categoryName,
  };
}

/** 모델에게 물어볼 후보를 몇 개까지 남길지. 늘리면 비용이 그만큼 늘어난다. */
export const DEFAULT_SHORTLIST_SIZE = 5;

/**
 * 모델에게 물어볼 후보를 추린다.
 *
 * 같은 분류의 도구는 글자가 덜 겹쳐도 남긴다 — 같은 일을 다른 말로 쓴 경우가
 * 여기 숨는다. 이 단계에서 놓치면 모델이 볼 기회조차 없다.
 */
export function shortlistCandidates(
  source: SimilarityInput,
  pool: readonly SimilarityInput[],
  limit: number = DEFAULT_SHORTLIST_SIZE,
): LexicalOverlap[] {
  return pool
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => compareLexically(source, candidate))
    .sort((left, right) => {
      // 점수가 비슷하면 같은 분류를 앞세운다.
      const categoryBias = Number(right.sameCategory) - Number(left.sameCategory);
      const scoreGap = right.overall - left.overall;
      return Math.abs(scoreGap) < 5 ? categoryBias || scoreGap : scoreGap;
    })
    .slice(0, Math.max(0, limit));
}

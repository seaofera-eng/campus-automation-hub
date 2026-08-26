/**
 * 데모 데이터에 들어갈 AI 분석을 미리 돌린다.
 *
 * 키는 `.env.local` 에 둡니다 (gitignore 에 있어 커밋되지 않습니다):
 *
 * ```
 * AI_GATEWAY_API_KEY=<충남대 AI 포털 키>
 * ```
 *
 * ```powershell
 * pnpm ai:analyze            # 전부
 * pnpm ai:analyze -- --only=duplicates   # duplicates / risk / demands / quality
 * pnpm ai:analyze -- --dry-run   # 부를 횟수와 예상 비용만
 * ```
 *
 * ## 왜 스크립트인가
 *
 * 시연 자리에서 API 키와 망에 기대고 싶지 않다. 분석은 여기서 미리 돌리고
 * `src/repositories/demo/seed-analyses.ts` 에 넣어 커밋한다. 앱은 그걸 읽기만
 * 한다. `pnpm demo:reset` 을 해도 살아난다.
 *
 * ## 무엇을 읽는가
 *
 * `.data/demo-db.json` — 시드 데이터가 만들어진 뒤의 상태다. 없으면 앱을 한 번
 * 띄워 만들라고 안내하고 끝낸다.
 *
 * ## 실패하면
 *
 * 한 건이 실패해도 나머지는 계속 돈다. 실패한 건은 결과에 안 들어가고,
 * 화면에서는 "아직 돌리지 않았습니다"로 나온다. 지어낸 값이 들어가는 경로는 없다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  analyzeDemand,
  analyzeDuplicates,
  analyzeRisk,
  drainUsage,
  isAiEnabled,
  reviewQuality,
  toDemandDigest,
  toToolDigest,
  type ToolDigest,
} from '../src/adapters/ai';
import type {
  DemandAnalysis,
  DuplicateAnalysis,
  QualityReview,
  RiskAnalysis,
} from '../src/domain/analysis/types';
import type { AutomationDemand } from '../src/domain/demand/types';
import type { ToolCategory, AutomationTool, AutomationToolVersion } from '../src/domain/tool/types';

interface DemoDatabase {
  categories: ToolCategory[];
  tools: AutomationTool[];
  toolVersions: AutomationToolVersion[];
  demands: AutomationDemand[];
}

const OUTPUT_PATH = resolve(process.cwd(), 'src/repositories/demo/seed-analyses.ts');
const DB_PATH = resolve(process.cwd(), process.env.DEMO_DATA_DIR ?? '.data', 'demo-db.json');

/** 한 번에 몇 건을 나란히 부를지. 올리면 빨라지고 속도 제한에 걸리기 쉬워진다. */
const CONCURRENCY = 3;

interface Options {
  dryRun: boolean;
  only: 'all' | 'duplicates' | 'risk' | 'demands' | 'quality';
}

function parseOptions(argv: readonly string[]): Options {
  const only = argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length) ?? 'all';
  const valid = ['all', 'duplicates', 'risk', 'demands', 'quality'] as const;
  if (!(valid as readonly string[]).includes(only)) {
    throw new Error(`--only 는 ${valid.join(' / ')} 중 하나여야 합니다. 받은 값: ${only}`);
  }
  return { dryRun: argv.includes('--dry-run'), only: only as Options['only'] };
}

/** 동시 실행 수를 제한하며 하나씩 흘려 보낸다. */
async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await worker(item, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

/** 결과를 TypeScript 파일로 내보낸다. 손으로 고치지 말라는 표시를 맨 위에 남긴다. */
function renderSeedFile(
  duplicates: DuplicateAnalysis[],
  risks: RiskAnalysis[],
  demands: DemandAnalysis[],
  qualityReviews: QualityReview[],
): string {
  const stringify = (value: unknown) => JSON.stringify(value, null, 2);

  return `import type {
  DemandAnalysis,
  DuplicateAnalysis,
  QualityReview,
  RiskAnalysis,
} from '@/domain/analysis/types';

/**
 * 미리 돌려 둔 AI 분석 결과.
 *
 * ⚠️ **이 파일은 \`pnpm ai:analyze\` 가 생성합니다. 손으로 고치지 마세요.**
 *    다음 실행 때 통째로 덮어씁니다.
 *
 * ## 왜 파일에 넣어 두는가
 *
 * 시연 자리에서 API 키와 망에 기대고 싶지 않습니다. 분석은 미리 돌려 두고,
 * 시연에서는 저장된 것만 읽습니다. \`pnpm demo:reset\` 을 해도 그대로 살아납니다.
 *
 * 미리 돌렸다는 것과 지어냈다는 것은 다릅니다. 여기 있는 값은 전부 실제 모델이
 * 실제 등록 내용을 보고 낸 판단이고, 어느 모델이 언제 냈는지가 각 항목의
 * \`provenance\` 에 붙어 화면에 그대로 표시됩니다.
 *
 * 생성 시각: ${new Date().toISOString()}
 */

/*
 * id 들이 \`as unknown as\` 를 거치는 이유: 도메인의 id 는 브랜드 타입인데
 * JSON 으로 한 번 왕복하면 그 표시가 벗겨집니다. 값 자체는 타입이 붙은 코드가
 * 만든 것이라 모양은 맞습니다.
 */

export const SEEDED_DUPLICATE_ANALYSES = ${stringify(duplicates)} as unknown as DuplicateAnalysis[];

export const SEEDED_RISK_ANALYSES = ${stringify(risks)} as unknown as RiskAnalysis[];

export const SEEDED_DEMAND_ANALYSES = ${stringify(demands)} as unknown as DemandAnalysis[];

export const SEEDED_QUALITY_REVIEWS = ${stringify(qualityReviews)} as unknown as QualityReview[];
`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  if (!options.dryRun && !isAiEnabled()) {
    log('API 키가 없습니다.');
    log('  .env.local 에 다음 줄을 넣어 주세요:');
    log('    AI_GATEWAY_API_KEY=<충남대 AI 포털 키>');
    log('  포털: https://aiportal.cnu.ac.kr/dashboard/developers');
    log('부를 횟수와 예상 비용만 보려면 --dry-run 을 붙이세요.');
    process.exitCode = 1;
    return;
  }

  let raw: string;
  try {
    raw = await readFile(DB_PATH, 'utf8');
  } catch {
    log(`데모 데이터가 없습니다 — ${DB_PATH}`);
    log('`pnpm dev` 로 앱을 한 번 띄워 시드 데이터를 만든 뒤 다시 실행하세요.');
    process.exitCode = 1;
    return;
  }

  const db = JSON.parse(raw) as DemoDatabase;
  const categoryNames = new Map(db.categories.map((category) => [category.id, category.name]));
  const versionsById = new Map(db.toolVersions.map((version) => [version.id, version]));

  // 삭제된 도구는 분석 대상도 비교 대상도 아니다.
  const liveTools = db.tools.filter((tool) => tool.deletedAt === null);

  const digests: { tool: AutomationTool; digest: ToolDigest }[] = [];
  for (const tool of liveTools) {
    const version = versionsById.get(tool.currentVersionId);
    if (!version) continue;
    digests.push({
      tool,
      digest: toToolDigest(tool, version, categoryNames.get(tool.categoryId) ?? '미분류'),
    });
  }

  const pool = digests.map((entry) => entry.digest);
  const liveDemands = db.demands.filter((demand) => demand.deletedAt === null);

  const wantDuplicates = options.only === 'all' || options.only === 'duplicates';
  const wantRisk = options.only === 'all' || options.only === 'risk';
  const wantDemands = options.only === 'all' || options.only === 'demands';
  const wantQuality = options.only === 'all' || options.only === 'quality';

  const callCount =
    (wantDuplicates ? digests.length : 0) +
    (wantRisk ? digests.length : 0) +
    (wantDemands ? liveDemands.length : 0) +
    // 품질검증은 관점이 둘이라 도구 하나에 두 번 부른다.
    (wantQuality ? digests.length * 2 : 0);

  log(`도구 ${digests.length}건, 수요 ${liveDemands.length}건`);
  log(`모델 호출 예정 ${callCount}회`);

  if (options.dryRun) {
    // 도구 하나당 입력 대략 4~6천 토큰, 출력 1~2천 토큰으로 잡은 어림값이다.
    const estimate = callCount * ((5000 * 5 + 1500 * 25) / 1_000_000);
    log(`예상 비용 약 $${estimate.toFixed(2)} (어림값)`);
    log('--dry-run 이라 실제로 부르지 않았습니다.');
    return;
  }

  const duplicates: DuplicateAnalysis[] = [];
  const risks: RiskAnalysis[] = [];
  const demandAnalyses: DemandAnalysis[] = [];
  const qualityReviews: QualityReview[] = [];
  let failed = 0;

  if (wantDuplicates) {
    log('\n중복 탐지…');
    const results = await mapLimited(digests, CONCURRENCY, async (entry) => {
      const analysis = await analyzeDuplicates({
        toolVersionId: entry.tool.currentVersionId,
        source: entry.digest,
        pool,
      });
      log(
        analysis
          ? `  ✓ ${entry.tool.name} — 겹치는 도구 ${analysis.findings.length}건`
          : `  ✗ ${entry.tool.name} — 실패`,
      );
      return analysis;
    });
    for (const result of results) {
      if (result) duplicates.push(result);
      else failed += 1;
    }
  }

  if (wantRisk) {
    log('\n위험도 평가…');
    const results = await mapLimited(digests, CONCURRENCY, async (entry) => {
      const analysis = await analyzeRisk({
        toolVersionId: entry.tool.currentVersionId,
        tool: entry.digest,
      });
      log(
        analysis
          ? `  ✓ ${entry.tool.name} — ${analysis.suggestedLevel}`
          : `  ✗ ${entry.tool.name} — 실패`,
      );
      return analysis;
    });
    for (const result of results) {
      if (result) risks.push(result);
      else failed += 1;
    }
  }

  if (wantDemands) {
    log('\n수요 매칭…');
    const results = await mapLimited(liveDemands, CONCURRENCY, async (demand) => {
      const analysis = await analyzeDemand({ demand: toDemandDigest(demand), pool });
      log(
        analysis
          ? `  ✓ ${demand.title} — ${analysis.outcome}`
          : `  ✗ ${demand.title} — 실패`,
      );
      return analysis;
    });
    for (const result of results) {
      if (result) demandAnalyses.push(result);
      else failed += 1;
    }
  }

  if (wantQuality) {
    log('\n멀티 LLM 품질검증…');
    const results = await mapLimited(digests, CONCURRENCY, async (entry) => {
      const review = await reviewQuality({
        toolVersionId: entry.tool.currentVersionId,
        tool: entry.digest,
      });
      log(
        review
          ? `  ✓ ${entry.tool.name} — ${review.verdict}${review.disagreement ? ' (판정 갈림)' : ''}`
          : `  ✗ ${entry.tool.name} — 실패`,
      );
      return review;
    });
    for (const result of results) {
      if (result) qualityReviews.push(result);
      else failed += 1;
    }
  }

  // --only 로 일부만 돌렸을 때 나머지를 날려 버리지 않는다.
  const existing = (await import('../src/repositories/demo/seed-analyses')) as {
    SEEDED_DUPLICATE_ANALYSES: DuplicateAnalysis[];
    SEEDED_RISK_ANALYSES: RiskAnalysis[];
    SEEDED_DEMAND_ANALYSES: DemandAnalysis[];
    SEEDED_QUALITY_REVIEWS: QualityReview[];
  };

  await writeFile(
    OUTPUT_PATH,
    renderSeedFile(
      wantDuplicates ? duplicates : existing.SEEDED_DUPLICATE_ANALYSES,
      wantRisk ? risks : existing.SEEDED_RISK_ANALYSES,
      wantDemands ? demandAnalyses : existing.SEEDED_DEMAND_ANALYSES,
      wantQuality ? qualityReviews : existing.SEEDED_QUALITY_REVIEWS,
    ),
    'utf8',
  );

  const { calls, totalCost } = drainUsage();
  log(`\n저장했습니다 — ${OUTPUT_PATH}`);
  log(`성공 ${calls.length}회 / 실패 ${failed}회 · 비용 $${totalCost.toFixed(4)}`);
  log('`pnpm demo:reset` 후 앱을 띄우면 화면에 반영됩니다.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

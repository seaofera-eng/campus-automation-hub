import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { drainUsage } from '@/adapters/ai/live/client';
import { analyzeDuplicates } from '@/adapters/ai/live/duplicate-detection';
import { reviewQuality } from '@/adapters/ai/live/quality-review';
import { toToolDigest } from '@/adapters/ai/live/redact';
import { analyzeRisk } from '@/adapters/ai/live/risk-assessment';
import type { ToolDigest } from '@/adapters/ai/live/redact';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { conflict, forbidden, notFound, preconditionFailed } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { ToolId } from '@/domain/shared/ids';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 검토 화면에서 AI 분석을 직접 돌린다 (리뷰 2026-08-30).
 *
 * "LLM을 통한 도구 검토도 관리자가 버튼식으로 실행할 수 있어?
 *  그냥 허용하면 API 토큰이 낭비될 것 같으니까 간단한 비밀코드를 입력하게"
 *
 * ## 원칙을 하나 바꿨다
 *
 * 지금까지는 **화면에서 모델을 부르지 않는다**가 규칙이었다. 분석은
 * `pnpm ai:analyze` 가 미리 돌리고 앱은 읽기만 했다. 그 규칙이 지키던 것은
 * 셋이다 — 화면이 즉시 뜬다, 같은 화면은 같은 결과를 낸다, 비용이 예측된다.
 *
 * 그런데 새로 올라온 도구는 분석이 없다. 스크립트를 돌릴 수 있는 사람만
 * 분석을 만들 수 있다면, 운영 중에는 아무도 못 만든다.
 *
 * 그래서 **읽기는 그대로 두고, 만드는 길만 하나 열었다.**
 *
 * - 화면을 열 때는 여전히 부르지 않는다. **버튼을 눌러야** 부른다.
 * - 결과는 저장된다. 저장된 뒤부터는 전과 똑같이 읽기만 한다.
 * - 그래서 "같은 화면은 같은 결과"는 그대로다.
 *
 * ## 세 겹으로 막는다
 *
 * 1. **검토 권한** — 이용자는 버튼 자체가 없다.
 * 2. **실행 코드** — `AI_RUN_CODE` 환경변수와 맞아야 한다. 안 정해 두면
 *    기능이 통째로 꺼진다. 권한이 있어도 코드를 모르면 못 부른다.
 * 3. **잠깐 쉬기** — 같은 도구를 연달아 돌리지 못한다. 토큰이 실제로
 *    새는 경로는 대개 두 번 누르는 것이다.
 *
 * 코드가 틀린 시도도 감사 로그에 실패로 남는다.
 */

/** 같은 도구를 다시 돌리기까지 기다리는 시간 */
const COOLDOWN_MS = 60_000;

/**
 * 마지막 실행 시각. 프로세스 안에서만 산다.
 *
 * 서버가 새로 뜨면 비워진다. 정교한 제한이 아니라 **연타를 막는 턱**이다.
 * 진짜 방어선은 권한과 실행 코드다.
 */
const lastRunAt = new Map<string, number>();

export interface RunAnalysisInput {
  toolId: string;
  accessCode: string;
}

export interface RunAnalysisResult {
  /** 기능별 성공 여부. 실패한 것은 그대로 실패로 남긴다 — 가짜로 채우지 않는다. */
  duplicate: boolean;
  risk: boolean;
  quality: boolean;
  /** 실제로 모델을 부른 횟수 */
  calls: number;
  /** 이번 실행의 대략 비용 (미화 달러) */
  cost: number;
}

/** 실행 코드가 맞는지. 길이가 달라도 같은 시간이 걸리게 비교한다. */
function codeMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // 길이만으로 정답을 좁히지 못하게 한 번은 비교하고 버린다.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function runToolAnalysis(
  actor: Profile,
  input: RunAnalysisInput,
): Promise<RunAnalysisResult> {
  assertCan(toActor(actor), 'analysis:run');

  const expected = process.env.AI_RUN_CODE?.trim();
  if (!expected) {
    throw preconditionFailed(
      '이 서버에서는 화면에서 분석을 돌릴 수 없습니다. 실행 코드(AI_RUN_CODE)가 정해져 있지 않습니다.',
    );
  }
  if (!codeMatches(input.accessCode.trim(), expected)) {
    throw forbidden('실행 코드가 맞지 않습니다. 코드를 확인하고 다시 입력해 주세요.');
  }

  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(input.toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  const since = Date.now() - (lastRunAt.get(tool.id as string) ?? 0);
  if (since < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - since) / 1000);
    throw conflict(
      `방금 이 도구를 분석했습니다. ${wait}초 뒤에 다시 눌러 주세요. 모델을 부를 때마다 비용이 듭니다.`,
    );
  }

  const version = await repositories.tools.getVersion(tool.currentVersionId);
  if (!version) throw notFound('도구 버전');

  const categories = await repositories.reference.listCategories(tool.campusId);
  const categoryName = categories.find((entry) => entry.id === tool.categoryId)?.name ?? '미분류';
  const source = toToolDigest(tool, version, categoryName);

  // 중복을 보려면 비교 상대가 필요하다. 지워진 것과 자기 자신은 뺀다.
  const pool = await buildPool(tool.campusId, tool.id as string);

  lastRunAt.set(tool.id as string, Date.now());
  drainUsage(); // 이번 실행 비용만 세기 위해 앞의 기록을 비운다

  /*
   * 셋을 나란히 돌린다.
   *
   * 차례로 돌리면 합쳐서 1분을 넘길 수 있고, 서버리스 환경에서는 그 전에
   * 잘린다. 셋은 서로를 참조하지 않으므로 순서가 의미 없다.
   */
  const [duplicate, risk, quality] = await Promise.all([
    analyzeDuplicates({ toolVersionId: tool.currentVersionId, source, pool }),
    analyzeRisk({ toolVersionId: tool.currentVersionId, tool: source }),
    reviewQuality({ toolVersionId: tool.currentVersionId, tool: source }),
  ]);

  // 성공한 것만 저장한다. 실패한 자리는 "아직 돌리지 않았습니다"로 남는다.
  if (duplicate) await repositories.analyses.upsertDuplicateAnalysis(duplicate);
  if (risk) await repositories.analyses.upsertRiskAnalysis(risk);
  if (quality) await repositories.analyses.upsertQualityReview(quality);

  const usage = drainUsage();
  return {
    duplicate: duplicate !== null,
    risk: risk !== null,
    quality: quality !== null,
    calls: usage.calls.length,
    cost: usage.totalCost,
  };
}

/** 중복 비교 대상. 살아 있는 도구의 최신 버전만 모은다. */
async function buildPool(campusId: string, excludeToolId: string): Promise<ToolDigest[]> {
  const repositories = getRepositories();
  const page = await repositories.tools.listTools({ campusId: campusId as never }, 'RECENT', {
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  });
  const categories = await repositories.reference.listCategories(campusId as never);
  const names = new Map(categories.map((entry) => [entry.id, entry.name]));

  const digests: ToolDigest[] = [];
  for (const other of page.items) {
    if ((other.id as string) === excludeToolId) continue;
    const version = await repositories.tools.getVersion(other.currentVersionId);
    if (!version) continue;
    digests.push(toToolDigest(other, version, names.get(other.categoryId) ?? '미분류'));
  }
  return digests;
}

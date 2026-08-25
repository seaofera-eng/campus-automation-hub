import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { AutomationDemand, DemandMatch, DemandParticipant } from '@/domain/demand/types';
import type { EvaluationHistoryEntry, ToolEvaluation } from '@/domain/evaluation/types';
import type { Campus, Profile } from '@/domain/identity/types';
import type {
  ImprovementRequest,
  ImprovementRequestHistoryEntry,
} from '@/domain/improvement/types';
import type { AuditLog, Notification, UsageEvent } from '@/domain/observability/types';
import type { ReviewAssignment, ReviewComment } from '@/domain/review/types';
import type { RiskChecklist } from '@/domain/tool/risk-checklist-rules';
import type {
  AutomationTool,
  AutomationToolVersion,
  IntegrationSystem,
  ToolAttachment,
  ToolCategory,
  ToolStatusHistoryEntry,
} from '@/domain/tool/types';
import { buildDemoSeed } from './seed';

/**
 * DEMO 모드 로컬 저장소.
 *
 * 하나의 JSON 파일에 모든 컬렉션을 담고, 프로세스 내 뮤텍스로 쓰기를 직렬화한다.
 * 쓰기는 임시 파일에 기록한 뒤 rename 하는 방식이라 중간에 죽어도 파일이 깨지지 않는다.
 *
 * 운영용 저장소가 아니다. 실제 배포에서는 Supabase 구현을 사용한다.
 */

export const DEMO_SCHEMA_VERSION = 1;

export interface DemoDatabase {
  schemaVersion: number;
  campuses: Campus[];
  profiles: Profile[];
  categories: ToolCategory[];
  integrationSystems: IntegrationSystem[];
  tools: AutomationTool[];
  toolVersions: AutomationToolVersion[];
  toolStatusHistory: ToolStatusHistoryEntry[];
  toolAttachments: ToolAttachment[];
  reviewAssignments: ReviewAssignment[];
  reviewComments: ReviewComment[];
  riskChecklists: RiskChecklist[];
  demands: AutomationDemand[];
  demandMatches: DemandMatch[];
  demandParticipants: DemandParticipant[];
  evaluations: ToolEvaluation[];
  evaluationHistory: EvaluationHistoryEntry[];
  improvementRequests: ImprovementRequest[];
  improvementRequestHistory: ImprovementRequestHistoryEntry[];
  auditLogs: AuditLog[];
  usageEvents: UsageEvent[];
  notifications: Notification[];
}

function dataDir(): string {
  // turbopackIgnore: 런타임 경로 계산이다. 이 표시가 없으면 번들러가 프로젝트 전체를
  // 추적 대상으로 잡아 빌드 경고를 낸다.
  return resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DEMO_DATA_DIR ?? '.data');
}

function dbPath(): string {
  return join(dataDir(), 'demo-db.json');
}

export function uploadsDir(): string {
  return join(dataDir(), 'uploads');
}

/* -------------------------------------------------------------------------- */
/* 뮤텍스                                                                      */
/* -------------------------------------------------------------------------- */

let writeChain: Promise<unknown> = Promise.resolve();

/** 쓰기 작업을 순차 실행한다. Next dev의 동시 요청에서 파일이 덮어써지는 것을 막는다. */
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeChain.then(operation, operation);
  // 체인이 실패해도 다음 작업은 계속 실행되어야 한다.
  writeChain = result.catch(() => undefined);
  return result;
}

/* -------------------------------------------------------------------------- */
/* 읽기 / 쓰기                                                                 */
/* -------------------------------------------------------------------------- */

let cache: DemoDatabase | null = null;
let cachedPath: string | null = null;

async function readFromDisk(): Promise<DemoDatabase | null> {
  try {
    const raw = await readFile(dbPath(), 'utf8');
    const parsed = JSON.parse(raw) as DemoDatabase;
    if (parsed.schemaVersion !== DEMO_SCHEMA_VERSION) {
      console.warn(
        `[demo-store] 스키마 버전이 다릅니다 (파일 ${parsed.schemaVersion} / 코드 ${DEMO_SCHEMA_VERSION}). 시드 데이터로 다시 만듭니다.`,
      );
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeToDisk(db: DemoDatabase): Promise<void> {
  const target = dbPath();
  await mkdir(dirname(target), { recursive: true });
  // 임시 파일에 먼저 쓰고 원자적으로 교체한다.
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(db, null, 2), 'utf8');
  await rename(temp, target);
}

/** 현재 데이터베이스를 읽는다. 파일이 없으면 시드 데이터를 만들어 저장한다. */
export async function loadDb(): Promise<DemoDatabase> {
  const path = dbPath();
  if (cache && cachedPath === path) return cache;

  return serialize(async () => {
    // 뮤텍스 안에서 다시 확인 — 대기 중에 다른 작업이 이미 채웠을 수 있다.
    if (cache && cachedPath === path) return cache;

    const existing = await readFromDisk();
    if (existing) {
      cache = existing;
      cachedPath = path;
      return existing;
    }

    const seeded = buildDemoSeed();
    await writeToDisk(seeded);
    cache = seeded;
    cachedPath = path;
    return seeded;
  });
}

/**
 * 데이터베이스를 수정한다. 콜백은 뮤텍스 안에서 실행되므로
 * 읽고-고치고-쓰는 과정이 다른 요청과 뒤섞이지 않는다.
 */
export async function mutateDb<T>(mutator: (db: DemoDatabase) => T | Promise<T>): Promise<T> {
  return serialize(async () => {
    const path = dbPath();
    let db = cache && cachedPath === path ? cache : await readFromDisk();
    if (!db) {
      db = buildDemoSeed();
    }
    const result = await mutator(db);
    await writeToDisk(db);
    cache = db;
    cachedPath = path;
    return result;
  });
}

/** 테스트에서 프로세스 캐시를 비운다. */
export function resetDemoStoreCache(): void {
  cache = null;
  cachedPath = null;
}

/* -------------------------------------------------------------------------- */
/* 공통 헬퍼                                                                   */
/* -------------------------------------------------------------------------- */

/** 저장 전에 참조가 새는 것을 막기 위해 깊은 복사본을 만든다. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function nowIso(): string {
  return new Date().toISOString();
}

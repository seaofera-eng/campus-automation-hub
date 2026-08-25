import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Profile } from '@/domain/identity/types';
import { resetEnvCache } from '@/lib/config/env';
import { resetContainer } from '@/lib/di/container';
import { getRepositories } from '@/lib/di/container';
import { DEMO_CAMPUS_ID, DEMO_USER_IDS } from '@/repositories/demo/seed-ids';
import { resetDemoStoreCache } from '@/repositories/demo/store';

/**
 * 통합 테스트 환경.
 *
 * 각 테스트 파일이 임시 디렉터리에 자기만의 DEMO 저장소를 갖는다.
 * 개발용 `.data/` 를 건드리지 않고, 테스트끼리도 서로 영향을 주지 않는다.
 */

let currentDir: string | null = null;

export function setupIsolatedStore(): void {
  currentDir = mkdtempSync(join(tmpdir(), 'campus-test-'));
  process.env.DEMO_DATA_DIR = currentDir;
  resetDemoStoreCache();
  resetContainer();
  resetEnvCache();
}

export function teardownIsolatedStore(): void {
  if (currentDir) {
    rmSync(currentDir, { recursive: true, force: true });
    currentDir = null;
  }
  delete process.env.DEMO_DATA_DIR;
  resetDemoStoreCache();
  resetContainer();
}

/** 시드 데이터의 역할별 계정을 읽어 온다. */
export async function demoProfile(
  role: keyof typeof DEMO_USER_IDS,
): Promise<Profile> {
  const profile = await getRepositories().identity.getProfile(DEMO_USER_IDS[role]);
  if (!profile) throw new Error(`데모 계정을 찾을 수 없습니다: ${role}`);
  return profile;
}

export { DEMO_CAMPUS_ID };

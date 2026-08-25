#!/usr/bin/env node
/**
 * DEMO 모드 로컬 데이터를 초기화한다.
 *
 * 데이터 파일이 없으면 앱이 다음 실행 때 시드 데이터를 자동으로 다시 만든다.
 * 실제 Supabase 데이터에는 절대 영향을 주지 않는다.
 */
import { rm, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const dataDir = resolve(process.cwd(), process.env.DEMO_DATA_DIR ?? '.data');

try {
  await access(dataDir);
  await rm(dataDir, { recursive: true, force: true });
  console.log(`[demo:reset] 초기화 완료 — ${dataDir}`);
} catch {
  console.log(`[demo:reset] 초기화할 데이터가 없습니다 — ${dataDir}`);
}

console.log('[demo:reset] 다음 실행 시 시드 데이터가 자동으로 생성됩니다.');

import 'server-only';
import type { AiServices } from '@/adapters/ai';
import { getAiServices } from '@/adapters/ai';
import { createDemoRepositories } from '@/repositories/demo';
import { createSupabaseRepositories } from '@/repositories/supabase';
import type { Repositories } from '@/repositories/types';
import { isDemoMode } from '../config/env';

/**
 * 의존성 조립 지점.
 *
 * DEMO_MODE 분기는 **오직 이 파일에만** 존재한다.
 * application 서비스와 UI는 어떤 구현이 주입되었는지 알지 못한다.
 */

let cachedRepositories: Repositories | null = null;
let cachedForDemoMode: boolean | null = null;

export function getRepositories(): Repositories {
  const demo = isDemoMode();
  if (cachedRepositories && cachedForDemoMode === demo) return cachedRepositories;

  const repositories = demo ? createDemoRepositories() : createSupabaseRepositories();
  cachedRepositories = repositories;
  cachedForDemoMode = demo;
  return repositories;
}

export function getAi(): AiServices {
  return getAiServices();
}

/** 테스트에서 컨테이너를 초기화한다. */
export function resetContainer(): void {
  cachedRepositories = null;
  cachedForDemoMode = null;
}

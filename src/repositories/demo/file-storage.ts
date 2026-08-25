import 'server-only';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import type { FileStorage } from '../types';
import { uploadsDir } from './store';

/**
 * DEMO 모드 파일 저장소.
 *
 * 업로드 파일을 `.data/uploads/` 아래에 저장한다.
 * 경로 조작(`../`)으로 디렉터리를 벗어나지 못하도록 저장 전에 정규화해 확인한다.
 */

function resolveSafePath(relativePath: string): string {
  const base = uploadsDir();
  const target = resolve(base, normalize(relativePath));
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error('허용되지 않은 저장 경로입니다.');
  }
  return target;
}

export function createDemoFileStorage(): FileStorage {
  return {
    async save(path: string, data: Uint8Array, _contentType: string): Promise<string> {
      const target = resolveSafePath(path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data);
      return path;
    },

    async getUrl(path: string): Promise<string> {
      // DEMO 모드에서는 앱 내부 라우트를 통해 내려준다.
      return `/api/demo-files/${path.split('/').map(encodeURIComponent).join('/')}`;
    },

    async remove(path: string): Promise<void> {
      const target = resolveSafePath(path);
      await rm(target, { force: true });
    },
  };
}

export function demoUploadPath(...segments: string[]): string {
  return join(...segments).split(sep).join('/');
}

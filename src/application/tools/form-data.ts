import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { ToolId } from '@/domain/shared/ids';
import type { IntegrationSystem, ToolCategory, ToolStatus } from '@/domain/tool/types';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import type { ToolFormInput } from '@/lib/validation/tool';
import { emptyToolForm } from '@/lib/validation/tool';
import { formFromTool } from './register';

/**
 * 등록 위저드가 필요로 하는 참조 데이터와 초기값.
 *
 * 화면은 저장소를 직접 부를 수 없으므로 이 서비스를 경유한다.
 */

export interface ToolFormPageData {
  actor: Profile;
  categories: ToolCategory[];
  integrationSystems: IntegrationSystem[];
  /** 함께 개발한 사람으로 지정할 수 있는 목록 */
  people: { id: string; name: string }[];
  /** 수정 중인 도구. 신규 등록이면 null. */
  tool: { id: string; status: ToolStatus } | null;
  initialForm: ToolFormInput;
}

async function loadReferenceData(actor: Profile) {
  const repositories = getRepositories();
  const [categories, integrationSystems, profiles] = await Promise.all([
    repositories.reference.listCategories(actor.campusId),
    repositories.reference.listIntegrationSystems(actor.campusId),
    repositories.identity.listProfiles(actor.campusId),
  ]);


  return {
    categories,
    integrationSystems,
    people: profiles
      .filter((profile) => profile.isActive)
      .map((profile) => ({
        id: profile.id,
        name: profile.name,
      })),
  };
}

/** 신규 등록 화면. */
export async function loadNewToolForm(): Promise<ToolFormPageData> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'tool:create');

  const reference = await loadReferenceData(actor);
  const initialForm = emptyToolForm();

  return { actor, ...reference, tool: null, initialForm };
}

/** 임시저장 이어쓰기 · 보완 요청 수정 화면. */
export async function loadToolEditForm(toolId: string): Promise<ToolFormPageData> {
  const actor = await requireUser();
  const repositories = getRepositories();

  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  assertCan(toActor(actor), 'tool:update', {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
  });

  const version = await repositories.tools.getVersion(tool.currentVersionId);
  if (!version) throw notFound('도구 버전');

  const reference = await loadReferenceData(actor);

  return {
    actor,
    ...reference,
    tool: { id: tool.id, status: tool.status },
    initialForm: formFromTool(tool, version),
  };
}

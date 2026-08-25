import 'server-only';
import type { Campus, Profile } from '@/domain/identity/types';
import type { CampusId, CategoryId, UserId } from '@/domain/shared/ids';
import type { ToolCategory } from '@/domain/tool/types';
import type { IdentityRepository, ReferenceDataRepository } from '../types';
import { getUserClient, throwOnError } from './client';
import {
  fromCategory,
  fromProfile,
  toCampus,
  toCategory,
  toProfile,
} from './mappers';

/** 역할은 user_roles 에 있으므로 항상 함께 조회한다. */
const PROFILE_SELECT = '*, user_roles(role)';

export function createSupabaseIdentityRepository(): IdentityRepository {
  return {
    async getCampus(id: CampusId): Promise<Campus | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase.from('campuses').select('*').eq('id', id).maybeSingle();
      throwOnError(error, '캠퍼스 조회');
      return data ? toCampus(data) : null;
    },

    async getDefaultCampus(): Promise<Campus> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      throwOnError(error, '캠퍼스 조회');
      if (!data) {
        throw new Error(
          '캠퍼스 데이터가 없습니다. supabase/migrations/0012_reference_seed.sql 을 적용해 주세요.',
        );
      }
      return toCampus(data);
    },





    async listProfiles(campusId: CampusId): Promise<Profile[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('campus_id', campusId)
        .is('deleted_at', null)
        .order('name', { ascending: true });
      throwOnError(error, '사용자 목록 조회');
      return (data ?? []).map(toProfile);
    },

    async getProfile(id: UserId): Promise<Profile | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', id)
        .maybeSingle();
      throwOnError(error, '사용자 조회');
      return data ? toProfile(data) : null;
    },

    async getProfileByEmail(email: string): Promise<Profile | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      throwOnError(error, '사용자 조회');
      return data ? toProfile(data) : null;
    },

    async updateProfile(profile: Profile): Promise<Profile> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('profiles')
        .update(fromProfile(profile))
        .eq('id', profile.id)
        .select(PROFILE_SELECT)
        .single();
      throwOnError(error, '사용자 정보 저장');

      // 권한은 별도 테이블이므로 함께 갱신한다.
      // 세부 권한이 줄어드는 경우가 있으므로 지우고 다시 넣는다.
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', profile.id);
      throwOnError(deleteError, '기존 권한 정리');

      const rows: { user_id: string; campus_id: string; role: string; admin_permission: string | null }[] =
        profile.accountType === 'ADMIN'
          ? profile.adminPermissions.map((permission) => ({
              user_id: profile.id,
              campus_id: profile.campusId,
              role: 'ADMIN',
              admin_permission: permission,
            }))
          : [
              {
                user_id: profile.id,
                campus_id: profile.campusId,
                role: 'USER',
                admin_permission: null,
              },
            ];

      const { error: roleError } = await supabase.from('user_roles').insert(rows);
      throwOnError(roleError, '권한 저장');

      return toProfile(data);
    },
  };
}

export function createSupabaseReferenceRepository(): ReferenceDataRepository {
  return {
    async listCategories(campusId: CampusId): Promise<ToolCategory[]> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_categories')
        .select('*')
        .eq('campus_id', campusId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      throwOnError(error, '카테고리 목록 조회');
      return (data ?? []).map(toCategory);
    },

    async getCategory(id: CategoryId): Promise<ToolCategory | null> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwOnError(error, '카테고리 조회');
      return data ? toCategory(data) : null;
    },

    async upsertCategory(category: ToolCategory): Promise<ToolCategory> {
      const supabase = await getUserClient();
      const { data, error } = await supabase
        .from('tool_categories')
        .upsert(fromCategory(category))
        .select('*')
        .single();
      throwOnError(error, '카테고리 저장');
      return toCategory(data);
    },

  };
}

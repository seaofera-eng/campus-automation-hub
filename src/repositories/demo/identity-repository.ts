import 'server-only';
import type { Campus, Profile } from '@/domain/identity/types';
import type { CampusId, UserId } from '@/domain/shared/ids';
import type { IdentityRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

export function createDemoIdentityRepository(): IdentityRepository {
  return {
    async getCampus(id: CampusId): Promise<Campus | null> {
      const db = await loadDb();
      return clone(db.campuses.find((campus) => campus.id === id) ?? null);
    },

    async getDefaultCampus(): Promise<Campus> {
      const db = await loadDb();
      const campus = db.campuses[0];
      if (!campus) throw new Error('데모 데이터에 캠퍼스가 없습니다. pnpm demo:reset 후 다시 시도해 주세요.');
      return clone(campus);
    },





    async listProfiles(campusId: CampusId): Promise<Profile[]> {
      const db = await loadDb();
      return clone(
        db.profiles
          .filter((profile) => profile.campusId === campusId && profile.deletedAt === null)
          .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
      );
    },

    async getProfile(id: UserId): Promise<Profile | null> {
      const db = await loadDb();
      return clone(db.profiles.find((profile) => profile.id === id) ?? null);
    },

    async getProfileByEmail(email: string): Promise<Profile | null> {
      const db = await loadDb();
      const normalized = email.trim().toLowerCase();
      return clone(
        db.profiles.find((profile) => profile.email.toLowerCase() === normalized) ?? null,
      );
    },

    async updateProfile(profile: Profile): Promise<Profile> {
      return mutateDb((db) => {
        const index = db.profiles.findIndex((row) => row.id === profile.id);
        if (index < 0) throw new Error(`프로필을 찾을 수 없습니다: ${profile.id}`);
        db.profiles[index] = clone(profile);
        return clone(profile);
      });
    },
  };
}

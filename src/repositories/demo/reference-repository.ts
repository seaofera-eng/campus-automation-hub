import 'server-only';
import type { CampusId, CategoryId } from '@/domain/shared/ids';
import type { ToolCategory } from '@/domain/tool/types';
import type { ReferenceDataRepository } from '../types';
import { clone, loadDb, mutateDb } from './store';

export function createDemoReferenceRepository(): ReferenceDataRepository {
  return {
    async listCategories(campusId: CampusId): Promise<ToolCategory[]> {
      const db = await loadDb();
      return clone(
        db.categories
          .filter((category) => category.campusId === campusId && category.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    },

    async getCategory(id: CategoryId): Promise<ToolCategory | null> {
      const db = await loadDb();
      return clone(db.categories.find((category) => category.id === id) ?? null);
    },

    async upsertCategory(category: ToolCategory): Promise<ToolCategory> {
      return mutateDb((db) => {
        const index = db.categories.findIndex((row) => row.id === category.id);
        if (index >= 0) db.categories[index] = clone(category);
        else db.categories.push(clone(category));
        return clone(category);
      });
    },

  };
}

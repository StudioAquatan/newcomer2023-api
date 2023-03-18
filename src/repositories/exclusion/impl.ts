import { UncommitedExclusion, Exclusion } from '../../models/exclusion';
import { D1Error } from '../../types/d1';
import { AlreadyExcludedError, ExclusionRepository } from './repository';

export class ExclusionRepositoryImpl implements ExclusionRepository {
  constructor(private db: D1Database) {}

  async migrate() {
    await this.db.exec(
      `CREATE TABLE IF NOT EXISTS exclusion(
        userId TEXT NOT NULL,
        orgId TEXT NOT NULL,
        PRIMARY KEY (userId, orgId)
      );`.replaceAll(/\n/g, ''),
    );
  }

  async create(exclusion: UncommitedExclusion): Promise<Exclusion> {
    try {
      await this.db
        .prepare(`INSERT INTO exclusion(userId, orgId) VALUES (?, ?)`)
        .bind(exclusion.userId, exclusion.orgId)
        .run();

      const storedExclusion = new Exclusion(exclusion.userId, exclusion.orgId);

      return storedExclusion;
    } catch (e) {
      const error = e as D1Error;
      if (error?.cause instanceof Error) {
        if (error.cause.message.includes('UNIQUE')) {
          throw new AlreadyExcludedError();
        }

        throw error?.cause;
      }
      throw error;
    }
  }

  async delete(exclusion: Exclusion): Promise<void> {
    await this.db
      .prepare(`DELETE FROM exclusion WHERE userId = ? AND orgId = ?`)
      .bind(exclusion.userId, exclusion.orgId)
      .run();
  }

  async getByUser(userId: string): Promise<Exclusion[]> {
    const result = await this.db
      .prepare(`SELECT orgId FROM exclusion WHERE userId = ?`)
      .bind(userId)
      .all<{ orgId: string }>();

    return (
      result.results?.map(({ orgId }) => new Exclusion(userId, orgId)) ?? []
    );
  }
}

import { NewVisit, Visit } from '../../models/visit';
import { D1Error } from '../../types/d1';
import { fromDateString, SQLDateString, toDateString } from '../../utils/date';
import { AlreadyVisitedException, VisitRepository } from './repository';

interface VisitResult {
  userId: string;
  orgId: string;
  visitedAt: SQLDateString;
}

export class VisitRepositoryImpl implements VisitRepository {
  constructor(private db: D1Database) {}

  async migrate() {
    await this.db.exec(
      `CREATE TABLE IF NOT EXISTS visits(
          userId TEXT NOT NULL,
          orgId TEXT NOT NULL,
          visitedAt TEXT DEFAULT (DATETIME(CURRENT_TIMESTAMP)),
          PRIMARY KEY (userId, orgId)
        )`.replaceAll(/\n/g, ''),
    );
  }

  async createVisit(visit: NewVisit): Promise<Visit> {
    try {
      await this.db
        .prepare(
          `INSERT INTO visits(userId, orgId, visitedAt) VALUES (?, ?, ?)`,
        )
        .bind(visit.userId, visit.orgId, toDateString(visit.visitedAt))
        .run();

      const storedVisit = new Visit(visit.userId, visit.orgId, visit.visitedAt);

      return storedVisit;
    } catch (e) {
      const error = e as D1Error;
      if (error?.cause instanceof Error) {
        if (error.cause.message.includes('UNIQUE')) {
          throw new AlreadyVisitedException();
        }

        throw error?.cause;
      }
      throw error;
    }
  }

  async getAllVisit(userId: string): Promise<Visit[]> {
    const results = await this.db
      .prepare('SELECT * FROM visits WHERE userId = ?')
      .bind(userId)
      .all<VisitResult>();

    if (!results.success || !results.results) {
      throw new Error('Database error');
    }

    return results.results.map(
      (result) =>
        new Visit(
          result.userId,
          result.orgId,
          fromDateString(result.visitedAt),
        ),
    );
  }
}

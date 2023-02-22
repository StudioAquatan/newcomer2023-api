import { Visit } from '../../models/visit';
import { D1Error } from '../../types/d1';
import { fromDateString, SQLDateString } from '../../utils/date';
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

  async createVisit(userId: string, orgId: string): Promise<Visit> {
    const insertStatement = this.db
      .prepare(`INSERT INTO visits(userId, orgId) VALUES (?, ?)`)
      .bind(userId, orgId);
    const selectStatement = this.db
      .prepare('SELECT * FROM visits WHERE userId = ? AND orgId = ?')
      .bind(userId, orgId);

    try {
      const [, selectResult] = await this.db.batch<VisitResult>([
        insertStatement,
        selectStatement,
      ]);

      if (!selectResult.results?.[0]) {
        throw new Error('Database error');
      }

      const visit = new Visit(
        selectResult.results[0].userId,
        selectResult.results[0].orgId,
        fromDateString(selectResult.results[0].visitedAt),
      );

      return visit;
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

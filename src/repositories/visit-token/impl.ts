import { NewVisitToken, VisitToken } from '../../models/visit-token';
import { D1Error } from '../../types/d1';
import { VisitTokenRepository, NoVisitTokenError } from './repository';

// orgの重複確認ができないのでD1にするしかない

interface VisitTokenResult {
  orgId: string;
}

export class VisitTokenRepositoryImpl implements VisitTokenRepository {
  constructor(private db: D1Database) {}

  async migrate() {
    await this.db.exec(
      'CREATE TABLE IF NOT EXISTS visit_token(orgId TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE)',
    );
  }

  async storeToken(newToken: NewVisitToken): Promise<VisitToken> {
    try {
      await this.db
        .prepare('INSERT INTO visit_token VALUES (?, ?)')
        .bind(newToken.orgId, newToken.token)
        .run();
      return new VisitToken(newToken.orgId, newToken.token);
    } catch (e) {
      const error = e as D1Error;
      if (error?.cause instanceof Error) {
        if (error.cause.message.includes('UNIQUE')) {
          throw new Error('Already token found');
        }

        throw error?.cause;
      }
      throw error;
    }
  }

  async findByToken(token: string): Promise<VisitToken> {
    const result = await this.db
      .prepare('SELECT orgId FROM visit_token WHERE token = ?')
      .bind(token)
      .all<VisitTokenResult>();

    if (result.results?.length !== 1) {
      throw new NoVisitTokenError();
    }

    return new VisitToken(result.results[0]!.orgId, token);
  }
}

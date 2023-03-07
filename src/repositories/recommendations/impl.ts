import {
  InitialRecommendation,
  SimpleRecommendation,
  UncommitedRecommendation,
} from '../../models/recommendations';
import { RecommendRepository, NoRecommendError } from './repository';

// DBから取得した診断結果
interface RecommendResult {
  id: string;
  orgs: string;
  numIgnore: number;
  numRenew: number;
}

export class RecommendRepositoryImpl implements RecommendRepository {
  constructor(private database: D1Database) {}

  async migrate() {
    await this.database.exec(
      `CREATE TABLE IF NOT EXISTS recommendation(
        id TEXT PRIMARY KEY,
        orgs TEXT DEFAULT NULL,
        numIgnore INTEGER DEFAULT 0,
        numRenew INTEGER DEFAULT 0
      );`.replaceAll(/\n/g, ''),
    );
  }

  async insertRecommend(
    initial: InitialRecommendation,
  ): Promise<SimpleRecommendation> {
    const insertStmt = this.database
      .prepare('INSERT INTO recommendation(id, orgs) VALUES (?, ?);')
      .bind(initial.userId, JSON.stringify(initial.orgs));

    const insertResult = await insertStmt.run();
    if (!insertResult.success) {
      // 既に登録されている
      throw new Error(`Failed to insert recommendation: ${insertResult.error}`);
    }

    return new SimpleRecommendation(
      initial.userId,
      initial.orgs,
      initial.numIgnore,
      initial.numRenew,
    );
  }

  async fetchRecommend(userId: string): Promise<SimpleRecommendation> {
    const selectStmt = this.database
      .prepare('SELECT * FROM recommendation WHERE id = ?;')
      .bind(userId);

    const selectResult = await selectStmt.all<RecommendResult>();
    if (!selectResult.success) {
      throw new Error(`Failed to fetch recommend: ${selectResult.error}`);
    } else if (!selectResult.results) {
      throw new NoRecommendError('Recommendation is not found');
    }

    const result: RecommendResult = selectResult.results[0];

    return new SimpleRecommendation(
      result.id,
      JSON.parse(result.orgs),
      result.numIgnore,
      result.numRenew,
    );
  }

  async renewRecommend(
    uncommited: UncommitedRecommendation,
  ): Promise<SimpleRecommendation> {
    const updateStmt = this.database
      .prepare('UPDATE recommendation SET orgs = ? WHERE id = ?;')
      .bind(JSON.stringify(uncommited.orgs), uncommited.userId);

    const updateResult = await updateStmt.run();
    if (!updateResult.success) {
      // 登録されていなかった
      throw new Error(`Failed to update user answer: ${updateResult.error}`);
    }

    return new SimpleRecommendation(
      uncommited.userId,
      uncommited.orgs,
      uncommited.numIgnore,
      uncommited.numRenew,
    );
  }
}

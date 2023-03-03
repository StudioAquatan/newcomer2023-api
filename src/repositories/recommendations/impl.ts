import {
  InitialRecommendation,
  SimpleRecommendation,
  UncommitedRecommendation,
} from '../../models/recommendations';
import { RecommendRepository } from './repository';

// DBから取得した診断結果
interface RecommendResult {
  id: string;
  orgs: string;
  ignoreRemains: number;
  renewRemains: number;
}

export class RecommendRepositoryImpl implements RecommendRepository {
  constructor(private database: D1Database) {}

  async migrate() {
    await this.database.exec(
      `CREATE TABLE IF NOT EXISTS recommendation(
        id TEXT PRIMARY KEY,
        orgs TEXT DEFAULT NULL,
        ignoreRemains INTEGER DEFAULT 5,
        renewRemains INTEGER DEFAULT 5
      );`.replaceAll(/\n/g, ''),
    );
  }

  async insertRecommend(
    initial: InitialRecommendation,
  ): Promise<SimpleRecommendation> {
    const insertStmt = this.database
      .prepare('INSERT INTO recommendation(id, orgs) VALUES (?, ?)')
      .bind(initial.userId, JSON.stringify(initial.orgs));

    const insertResult = await insertStmt.run();
    if (!insertResult.success) {
      // 既に登録されている
      throw new Error(`Failed to insert recommendation: ${insertResult.error}`);
    }

    return new SimpleRecommendation(
      initial.userId,
      initial.orgs,
      initial.ignoreRemains,
      initial.renewRemains,
    );
  }

  async getRecommend(userId: string): Promise<SimpleRecommendation> {
    const selectStmt = this.database
      .prepare('SELECT * FROM recommendation WHERE id = ?')
      .bind(userId);

    const selectResult = await selectStmt.all<RecommendResult>();
    if (!selectResult.success || typeof selectResult.results === 'undefined') {
      throw new Error(`Failed to get recommend: ${selectResult.error}`);
    }

    const result: RecommendResult = selectResult.results[0];

    return new SimpleRecommendation(
      result.id,
      JSON.parse(result.orgs),
      result.ignoreRemains,
      result.renewRemains,
    );
  }

  async renewRecommend(
    uncommited: UncommitedRecommendation,
  ): Promise<SimpleRecommendation> {
    const updateStmt = this.database
      .prepare('UPDATE recommendation SET orgs = ? WHERE id = ?')
      .bind(JSON.stringify(uncommited.orgs), uncommited.userId);

    const updateResult = await updateStmt.run();
    if (!updateResult.success) {
      // 登録されていなかった
      throw new Error(`Failed to update user answer: ${updateResult.error}`);
    }

    return new SimpleRecommendation(
      uncommited.userId,
      uncommited.orgs,
      uncommited.ignoreRemains,
      uncommited.renewRemains,
    );
  }
}

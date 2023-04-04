import { Reward } from '../../models/reward';
import { RewardsRepository } from './repository';

interface RewardResult {
  id: string;
  userId: string;
  amount: number;
  consumed: number;
  token: string;
}
export class RewardsRepositoryImpl implements RewardsRepository {
  constructor(private database: D1Database) {}

  async migrate() {
    await this.database.exec(
      `CREATE TABLE IF NOT EXISTS rewards(
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        amount INTEGER DEFAULT 0,
        consumed INTEGER DEFAULT 0,
        token TEXT NOT NULL
      );`.replaceAll(/\n/g, ''),
    );
  }

  async save(reward: Reward): Promise<Reward> {
    await this.database
      .prepare(
        'INSERT INTO rewards (id, userId, amount, consumed, token) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET consumed = ?',
      )
      .bind(
        reward.id,
        reward.userId,
        reward.amount,
        reward.consumed ? 1 : 0,
        reward.token,
        reward.consumed ? 1 : 0,
      )
      .run();

    return reward;
  }

  async getByUserId(userId: string): Promise<Reward[]> {
    const rewards = await this.database
      .prepare(
        'SELECT id, userId, amount, consumed, token FROM rewards WHERE userId = ?',
      )
      .bind(userId)
      .all<RewardResult>();

    if (!rewards.results) {
      throw new Error('Database error');
    }

    return rewards.results.map(
      (result) =>
        new Reward(
          result.id,
          result.userId,
          result.amount,
          result.consumed > 0,
          result.token,
        ),
    );
  }

  async delete(reward: Reward): Promise<void> {
    await this.database
      .prepare('DELETE FROM rewards WHERE id = ?')
      .bind(reward.id)
      .run();
  }
}

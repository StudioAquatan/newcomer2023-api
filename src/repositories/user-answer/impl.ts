import { UserAnswer, UncommitedUserAnswer } from '../../models/user-answer';
import { UserAnswerRepository } from './repository';

// DBから取得したユーザの回答結果
interface UserAnswerResult {
  id: string;
  answers: string;
  numAnswered: number;
}

export class UserAnswerRepositoryImpl implements UserAnswerRepository {
  constructor(private database: D1Database) {}

  async migrate() {
    await this.database.exec(
      `CREATE TABLE IF NOT EXISTS user_answer(
        id TEXT PRIMARY KEY,
        answers TEXT DEFAULT NULL
      );`.replaceAll(/\n/g, ''), // /g: 繰り返し置換せよ
    );
  }

  async insertUserAnswer(
    uncommited: UncommitedUserAnswer,
  ): Promise<UserAnswer> {
    const insertStmt = this.database
      .prepare('INSERT INTO user_answer(id, answers) VALUES (?, ?);')
      .bind(uncommited.userId, JSON.stringify(uncommited.answers));

    const insertResult = await insertStmt.run();
    if (!insertResult.success) {
      // 既に登録されている
      throw new Error(`Failed to insert user's answer: ${insertResult.error}`);
    }

    return new UserAnswer(uncommited.userId, uncommited.answers);
  }

  async fetchUserAnswer(userId: string): Promise<UserAnswer> {
    const selectStmt = this.database
      .prepare('SELECT * FROM user_answer WHERE id = ?;')
      .bind(userId);

    const selectResult = await selectStmt.all<UserAnswerResult>();
    if (!selectResult.success) {
      throw new Error(`Failed to fetch user answer: ${selectResult.error}`);
    } else if (!selectResult.results) {
      throw new Error('User answer is not found');
    }

    const result: UserAnswerResult = selectResult.results[0];
    return new UserAnswer(result.id, JSON.parse(result.answers));
  }

  async updateUserAnswer(
    uncommited: UncommitedUserAnswer,
  ): Promise<UserAnswer> {
    const updateStmt = this.database
      .prepare('UPDATE user_answer SET answers = ? WHERE id = ?;')
      .bind(JSON.stringify(uncommited.answers), uncommited.userId);

    const updateResult = await updateStmt.run();
    if (!updateResult.success) {
      // 登録されていなかった
      throw new Error(`Failed to update user answer: ${updateResult.error}`);
    }

    return new UserAnswer(uncommited.userId, uncommited.answers);
  }
}

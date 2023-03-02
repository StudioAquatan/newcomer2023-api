import { UserAnswer, UncommitedUserAnswer } from '../../models/user-answer';
import { UserAnswerRepository } from './repository';

export class UserAnswerRepositoryImpl implements UserAnswerRepository {
  constructor(private database: D1Database) {}

  async migrate() {
    await this.database.exec(
      `CREATE TABLE IF NOT EXISTS user_answer(
        id TEXT PRIMARY KEY,
        answers TEXT DEFAULT NULL,
        numAnswered INTEGER DEFAULT 1
      );`.replaceAll(/\n/g, ''), // /g: 繰り返し置換せよ
    );
  }

  async insertUserAnswer(userAnwer: UncommitedUserAnswer): Promise<UserAnswer> {
    const insertStmt = this.database
      .prepare('INSERT INTO user_answer(id, answers) VALUES (?, ?)')
      .bind(userAnwer.id, JSON.stringify(userAnwer.answers));

    const insertResult = await insertStmt.run();
    if (!insertResult.success) {
      // 既に登録されている
      throw new Error(`Failed to insert user's answer: ${insertResult.error}`);
    }

    return new UserAnswer(
      userAnwer.id,
      userAnwer.answers,
      userAnwer.numAnswered,
    );
  }

  async getUserAnswer(userId: string): Promise<UserAnswer> {
    const selectStmt = this.database
      .prepare('SELECT * FROM user_answer WHERE id = ?')
      .bind(userId);

    const selectResult = await selectStmt.all<UserAnswer>();
    if (!selectResult.success || typeof selectResult.results === 'undefined') {
      throw new Error(`Failed to get user answer: ${selectResult.error}`);
    }

    const answers: UserAnswer = selectResult.results[0];
    return answers;
  }

  async updateUserAnswer(
    userAnswer: UncommitedUserAnswer,
  ): Promise<UserAnswer> {
    const updateStmt = this.database
      .prepare('UPDATE user_answer SET answers = ? WHERE id = ?')
      .bind(JSON.stringify(userAnswer.answers), userAnswer.id);

    const updateResult = await updateStmt.run();
    if (!updateResult.success) {
      // 登録されていなかった
      throw new Error(`Failed to update user answer: ${updateResult.error}`);
    }

    return new UserAnswer(
      userAnswer.id,
      userAnswer.answers,
      userAnswer.numAnswered,
    );
  }
}

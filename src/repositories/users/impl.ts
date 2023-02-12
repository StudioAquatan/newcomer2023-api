import { User, UncommitedUser } from '../../models/users';
import { UserRepository } from './repository';
import { v4 as uuid } from 'uuid';
import { fromDateString, SQLDateString } from '../../utils/date';

interface UserResult {
  id: string;
  nickname: string | null;
  createdAt: SQLDateString;
}

export class UserRepositoryImpl implements UserRepository {
  constructor(private database: D1Database) {}

  async migrate() {
    await this.database.exec(`
        CREATE TABLE IF NOT EXISTS users(id TEXT(36) PRIMARY KEY, nickname TEXT DEFAULT NULL, createdAt TEXT DEFAULT DATETIME(CURRENT_TIMESTAMP));
    `);
  }

  async registerUser(): Promise<User> {
    const userId = uuid();

    const [insertResult, selectResult] = await this.database.batch<
      Omit<UserResult, 'nickname'>
    >([
      this.database.prepare('INSERT INTO users(id) VALUES (?)').bind(userId),
      this.database
        .prepare('SELECT id, createdAt FROM users WHERE id = ?')
        .bind(userId),
    ]);

    if (!insertResult.success) {
      throw new Error(`User registration failed: ${insertResult.error}`);
    }

    if (!selectResult.success || selectResult.results?.length !== 1) {
      throw new Error(`User registration failed: ${selectResult.error}`);
    }

    const user = new User(
      selectResult.results[0].id,
      null,
      fromDateString(selectResult.results[0].createdAt),
    );

    return user;
  }

  async commitUser(user: UncommitedUser): Promise<User> {
    // Nickname is only editable
    const commitStatement = this.database.prepare(
      'UPDATE users SET nickname = ? WHERE id = ?',
    );

    commitStatement.bind(user.nickname, user.id);
    const result = await commitStatement.run();

    if (!result.success) {
      throw new Error('Commit user failed');
    }

    return new User(user.id, user.nickname, user.createdAt);
  }
}

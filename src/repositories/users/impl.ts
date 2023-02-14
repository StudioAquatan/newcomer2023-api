import { v4 as uuid } from 'uuid';
import { User, UncommitedUser } from '../../models/users';
import { fromDateString, SQLDateString } from '../../utils/date';
import { UserRepository } from './repository';

interface UserResult {
  id: string;
  nickname: string | null;
  createdAt: SQLDateString;
}

export class UserRepositoryImpl implements UserRepository {
  constructor(private database: D1Database) {}

  async migrate() {
    await this.database.exec(`
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, nickname TEXT DEFAULT NULL, createdAt TEXT DEFAULT (DATETIME(CURRENT_TIMESTAMP)));
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

  async getUser(id: string): Promise<User> {
    const getStatement = this.database.prepare(
      'SELECT * FROM users WHERE id = ?',
    );

    const result = await getStatement.bind(id).all<UserResult>();

    const user = result.results?.[0];

    if (!result.success || result.results?.length != 1 || !user) {
      throw new Error('Get user failed');
    }

    return new User(user.id, user.nickname, fromDateString(user.createdAt));
  }

  async commitUser(user: UncommitedUser): Promise<User> {
    // Nickname is only editable
    const commitStatement = this.database.prepare(
      'UPDATE users SET nickname = ? WHERE id = ?',
    );

    const result = await commitStatement.bind(user.nickname, user.id).run();

    if (!result.success) {
      throw new Error('Commit user failed');
    }

    return new User(user.id, user.nickname, user.createdAt);
  }
}

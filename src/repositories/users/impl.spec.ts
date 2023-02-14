import { DateTime } from 'luxon';
import { User } from '../../models/users';
import { UserRepositoryImpl } from './impl';

const { __D1_BETA__DB } = getMiniflareBindings();

describe('UserRepositoryImpl', () => {
  const impl = new UserRepositoryImpl(__D1_BETA__DB);
  const testUser = new User(
    'f1e05f6a-0564-4356-83a6-610298c64ab5',
    null,
    DateTime.fromSQL('2017-05-15 09:12:34', { zone: 'UTC' }),
  );

  beforeEach(async () => {
    await impl.migrate();
    await __D1_BETA__DB
      .prepare('INSERT INTO users VALUES (?, ?, ?)')
      .bind('f1e05f6a-0564-4356-83a6-610298c64ab5', null, '2017-05-15 09:12:34')
      .run();
  });

  afterEach(async () => {
    await __D1_BETA__DB.exec('DELETE FROM users');
  });

  test('registerUser', async () => {
    const user = await impl.registerUser();
    expect(user.id).toBeDefined();
    expect(user.createdAt.diffNow().as('second')).toBeLessThanOrEqual(1);
  });

  test('getUser', async () => {
    const user = await impl.getUser('f1e05f6a-0564-4356-83a6-610298c64ab5');
    expect(user.id).toBe(testUser.id);
    expect(user.createdAt).toStrictEqual(testUser.createdAt);
    expect(user.nickname).toBe(testUser.nickname);
  });

  test('commitUser (updateNickname)', async () => {
    const uncommited = testUser.updateNickname('test');
    const newUser = await impl.commitUser(uncommited);
    expect(newUser.id).toBe(testUser.id);
    expect(newUser.createdAt).toStrictEqual(testUser.createdAt);
    expect(newUser.nickname).toBe('test');
    expect(newUser.nickname).not.toBe(testUser.nickname);
  });
});

export {};

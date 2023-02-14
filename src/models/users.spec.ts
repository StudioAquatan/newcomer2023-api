import { DateTime } from 'luxon';
import { User } from './users';

describe('User model', () => {
  const testUser = () =>
    new User(
      'f1e05f6a-0564-4356-83a6-610298c64ab5',
      'test',
      DateTime.fromSQL('2017-05-15 09:12:34', { zone: 'UTC' }),
    );

  it('updateNickname', () => {
    const user = testUser();
    const uncommited = user.updateNickname('nick');

    expect(uncommited.id).toBe(testUser().id);
    expect(uncommited.nickname).not.toBe(testUser().nickname);
    expect(uncommited.nickname).toBe('nick');
    expect(uncommited.createdAt).toStrictEqual(testUser().createdAt);
  });

  it('deleteNickname', () => {
    const user = testUser();
    const uncommited = user.deleteNickname();

    expect(uncommited.id).toBe(testUser().id);
    expect(uncommited.nickname).not.toBe(testUser().nickname);
    expect(uncommited.nickname).toBeNull();
    expect(uncommited.createdAt).toStrictEqual(testUser().createdAt);
  });
});
export {};

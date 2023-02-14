import { DateTime } from 'luxon';

class UserBase {
  constructor(
    public readonly id: string,
    public readonly nickname: string | null,
    public readonly createdAt: DateTime,
  ) {}

  updateNickname(nickname: string): UncommitedUser {
    return new UncommitedUser(this.id, nickname, this.createdAt);
  }

  deleteNickname(): UncommitedUser {
    return new UncommitedUser(this.id, null, this.createdAt);
  }
}

const persistentMarker = Symbol();

// DB上のユーザ表現
export class User extends UserBase {
  [persistentMarker] = null;
}

const updatedMarker = Symbol();
// メモリ上の書き込まれていないユーザ表現
export class UncommitedUser extends UserBase {
  [updatedMarker] = null;
}

export class User {
  constructor(
    public readonly id: string,
    public readonly nickname: string | null,
    public readonly createdAt: Date,
  ) {}

  updateNickname(nickname: string): UncommitedUser {
    return new UncommitedUser(this.id, nickname, this.createdAt);
  }

  deleteNickname(): UncommitedUser {
    return new UncommitedUser(this.id, null, this.createdAt);
  }
}

declare const updatedMarker: unique symbol;
export class UncommitedUser extends User {
  [updatedMarker]: null = null;
}

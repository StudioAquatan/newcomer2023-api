import { UncommitedUser, User } from '../../models/users';

export interface UserRepository {
  registerUser(): Promise<User>;
  getUser(id: string): Promise<User>;
  commitUser(user: UncommitedUser): Promise<User>;
}

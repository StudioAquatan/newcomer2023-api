import { User } from '../../models/users';
import { UserRepository } from '../../repositories/users/repository';
import { UserTokenController } from './token';

export interface RegisterUserResult {
  token: string;
  user: User;
}

export class UserController {
  constructor(
    private userRepo: UserRepository,
    private tokenController: UserTokenController,
  ) {}

  async registerUser(): Promise<RegisterUserResult> {
    const user = await this.userRepo.registerUser();
    const token = await this.tokenController.create(user.id);

    return { token, user };
  }
}

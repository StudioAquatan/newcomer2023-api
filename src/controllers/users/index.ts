import { Context } from 'hono';
import { z } from 'zod';
import { User } from '../../models/users';
import { UserRepository } from '../../repositories/users/repository';
import { operations, components } from '../../schema';
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

  static getTokenFromHeader(ctx: Context) {
    const tokenHeader = ctx.req.header('Authorization');
    return tokenHeader?.replace(/^[bB]earer\s+/, '');
  }

  static userToResponse(
    user: User,
  ): z.TypeOf<typeof components.schemas.User.serializer> {
    return {
      id: user.id,
      nickname: user.nickname,
      createdAt: user.createdAt.toISO(),
    };
  }

  async registerUser(): Promise<RegisterUserResult> {
    const user = await this.userRepo.registerUser();
    const token = await this.tokenController.create(user.id);

    return { token, user };
  }

  async getUser(
    token: string,
  ): Promise<
    z.TypeOf<
      (typeof operations)['get-user']['responses'][200]['content']['application/json']
    >
  > {
    const userId = await this.tokenController.parseToId(token);
    const user = await this.userRepo.getUser(userId);
    return UserController.userToResponse(user);
  }

  async updateNickname(
    token: string,
    body: unknown,
  ): Promise<
    z.TypeOf<
      (typeof operations)['patch-user']['responses'][200]['content']['application/json']
    >
  > {
    const request =
      operations['patch-user'].requestBody.content['application/json'].parse(
        body,
      );
    const userId = await this.tokenController.parseToId(token);
    const user = await this.userRepo.getUser(userId);

    const newUser = () => {
      if (request.nickname) return user.updateNickname(request.nickname);
      else return user.deleteNickname();
    };
    const commitedUser = await this.userRepo.commitUser(newUser());

    return UserController.userToResponse(commitedUser);
  }
}

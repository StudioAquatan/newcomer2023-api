import { Context } from 'hono';
// eslint-disable-next-line import/no-unresolved
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { HonoEnv } from '../..';
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
    const token = tokenHeader?.replace(/^[bB]earer\s+/, '');

    if (!token) {
      throw new HTTPException(401);
    }

    return token;
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
    ctx: Context<HonoEnv>,
  ): Promise<
    z.TypeOf<
      (typeof operations)['get-user']['responses'][200]['content']['application/json']
    >
  > {
    const token = UserController.getTokenFromHeader(ctx);
    const userId = await this.tokenController.parseToId(token);
    const user = await this.userRepo.getUser(userId);
    return UserController.userToResponse(user);
  }

  async updateNickname(
    ctx: Context<HonoEnv>,
  ): Promise<
    z.TypeOf<
      (typeof operations)['patch-user']['responses'][200]['content']['application/json']
    >
  > {
    const body = await ctx.req.json();
    const token = UserController.getTokenFromHeader(ctx);

    const request =
      operations['patch-user'].requestBody.content['application/json'].parse(
        body,
      );
    const userId = await this.tokenController.parseToId(token);
    const user = await this.userRepo.getUser(userId);

    if (request.nickname && request.nickname.length > 16) {
      throw new HTTPException(400, { message: 'Too long nickname' });
    }

    const newUser = () => {
      if (request.nickname) return user.updateNickname(request.nickname);
      else return user.deleteNickname();
    };
    const commitedUser = await this.userRepo.commitUser(newUser());

    return UserController.userToResponse(commitedUser);
  }
}

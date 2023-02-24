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

  static userToResponse(
    user: User,
  ): z.TypeOf<typeof components.schemas.User.serializer> {
    return {
      id: user.id,
      nickname: user.nickname,
      createdAt: user.createdAt.toISO(),
    };
  }

  async registerUser(ctx: Context<HonoEnv>): Promise<Response> {
    const user = await this.userRepo.registerUser();
    const token = await this.tokenController.create(user.id);

    const responseType =
      operations['post-user'].responses[200].content['application/json'];

    return ctx.json(responseType.parse({ token, user }));
  }

  async getUser(ctx: Context<HonoEnv>): Promise<Response> {
    const token = UserTokenController.getTokenFromHeader(ctx);
    const userId = await this.tokenController.parseToId(token);
    const user = await this.userRepo.getUser(userId);

    const responseType =
      operations['get-user']['responses'][200]['content']['application/json'];
    return ctx.json(responseType.parse(UserController.userToResponse(user)));
  }

  async updateNickname(ctx: Context<HonoEnv>): Promise<Response> {
    const body = await ctx.req.json();
    const token = UserTokenController.getTokenFromHeader(ctx);

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

    const responseType =
      operations['patch-user']['responses'][200]['content']['application/json'];

    return ctx.json(
      responseType.parse(UserController.userToResponse(commitedUser)),
    );
  }
}

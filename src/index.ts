/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from 'hono';
import { UserController } from './controllers/users';
import { UserTokenController } from './controllers/users/token';
import { UserRepositoryImpl } from './repositories/users/impl';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type WorkersEnv = {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_ISSUER: string;
};

export type HonoEnv = { Bindings: WorkersEnv };

const createApplication = (env: WorkersEnv) => {
  const userRepository = new UserRepositoryImpl(env.DB);
  const userTokenController = new UserTokenController(
    env.JWT_SECRET,
    env.JWT_ISSUER,
  );
  const userController = new UserController(
    userRepository,
    userTokenController,
  );

  return {
    userRepository,
    userTokenController,
    userController,
  };
};

const app = new Hono<HonoEnv>();

app.post('/user', async (ctx) => {
  const { userController } = createApplication(ctx.env);
  return ctx.json(await userController.registerUser());
});

app.patch('/user', async (ctx) => {
  const { userController } = createApplication(ctx.env);
  return ctx.json(await userController.updateNickname(ctx));
});

app.get('/user', async (ctx) => {
  const { userController } = createApplication(ctx.env);
  return ctx.json(await userController.getUser(ctx));
});

export default app;

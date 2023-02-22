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
import { OrganizationController } from './controllers/orgs';
import { QuestionController } from './controllers/question';
import { UserController } from './controllers/users';
import { UserTokenController } from './controllers/users/token';
import { OrgnizationRepositoryImpl } from './repositories/orgs/impl';
import { QuestionRepositoryImpl } from './repositories/question/impl';
import { UserRepositoryImpl } from './repositories/users/impl';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type WorkersEnv = {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_ISSUER: string;
  NEWT_SPACE_UID: string;
  NEWT_APP_UID: string;
  NEWT_API_KEY: string;
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

  const orgsRepository = new OrgnizationRepositoryImpl(
    env.NEWT_SPACE_UID,
    env.NEWT_APP_UID,
    env.NEWT_API_KEY,
  );
  const orgsController = new OrganizationController(orgsRepository);

  const questionRepository = new QuestionRepositoryImpl(
    env.NEWT_SPACE_UID,
    env.NEWT_APP_UID,
    env.NEWT_API_KEY,
  );
  const questionController = new QuestionController(questionRepository);

  return {
    userRepository,
    userTokenController,
    userController,
    orgsRepository,
    orgsController,
    questionRepository,
    questionController,
  };
};

const app = new Hono<HonoEnv>();

app.post('/migrate', async (ctx) => {
  const { userRepository } = createApplication(ctx.env);

  await userRepository.migrate();

  return ctx.json({});
});

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

app.get('/orgs', async (ctx) => {
  const { orgsController } = createApplication(ctx.env);
  return ctx.json(await orgsController.getOrgsList());
});

app.get('/question', async (ctx) => {
  const { questionController } = createApplication(ctx.env);
  return ctx.json(await questionController.getQuestionList());
});

export default app;

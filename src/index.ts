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
// eslint-disable-next-line import/no-unresolved
import { cors } from 'hono/cors';
import { OrganizationController } from './controllers/orgs';
import { QuestionController } from './controllers/question';
import { UserController } from './controllers/users';
import { UserTokenController } from './controllers/users/token';
import { VisitController } from './controllers/visits';
import { OrgnizationRepositoryImpl } from './repositories/orgs/impl';
import { QuestionRepositoryImpl } from './repositories/question/impl';
import { UserRepositoryImpl } from './repositories/users/impl';
import { VisitTokenRepositoryImpl } from './repositories/visit-token/impl';
import { VisitRepositoryImpl } from './repositories/visits/impl';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type WorkersEnv = {
  DB: D1Database;
  KV: KVNamespace;
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

  const visitRepository = new VisitRepositoryImpl(env.DB);
  const visitTokenRepository = new VisitTokenRepositoryImpl(env.DB);
  const visitController = new VisitController(
    userTokenController,
    visitRepository,
    visitTokenRepository,
    orgsRepository,
  );

  return {
    userRepository,
    userTokenController,
    userController,
    orgsRepository,
    orgsController,
    questionRepository,
    questionController,
    visitRepository,
    visitTokenRepository,
    visitController,
  };
};

const app = new Hono<HonoEnv>();

app.use(
  '*',
  cors({
    origin(origin) {
      return origin.includes('//localhost')
        ? origin
        : 'https://irodori-newcomer-2023.pages.dev';
    },
    credentials: true,
    allowHeaders: ['Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
);

app.post('/migrate', async (ctx) => {
  const {
    userRepository,
    visitRepository,
    visitTokenRepository,
    visitController,
  } = createApplication(ctx.env);

  await userRepository.migrate();
  await visitRepository.migrate();
  await visitTokenRepository.migrate();

  await visitController.registerAll();

  return ctx.json({});
});

app.post('/user', async (ctx) => {
  const { userController } = createApplication(ctx.env);
  return userController.registerUser(ctx);
});

app.patch('/user', async (ctx) => {
  const { userController } = createApplication(ctx.env);
  return userController.updateNickname(ctx);
});

app.get('/user', async (ctx) => {
  const { userController } = createApplication(ctx.env);
  return userController.getUser(ctx);
});

app.get('/orgs', async (ctx) => {
  const { orgsController } = createApplication(ctx.env);
  return orgsController.getOrgsList(ctx);
});

app.get('/questions', async (ctx) => {
  const { questionController } = createApplication(ctx.env);
  return questionController.getQuestionList(ctx);
});

app.get('/visit', async (ctx) => {
  const { visitController } = createApplication(ctx.env);
  return visitController.getAllVisit(ctx);
});

app.post('/visit/:token', async (ctx) => {
  const { visitController } = createApplication(ctx.env);
  return visitController.recordVisit(ctx);
});

export default app;

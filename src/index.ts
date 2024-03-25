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
import { RecommendController } from './controllers/recommendation/matching';
import { UserController } from './controllers/users';
import { UserTokenController } from './controllers/users/token';
import { VisitController } from './controllers/visits';
import { ExclusionRepositoryImpl } from './repositories/exclusion/impl';
import { OrgnizationRepositoryImpl } from './repositories/orgs/impl';
import { QuestionRepositoryImpl } from './repositories/question/impl';
import { RecommendRepositoryImpl } from './repositories/recommendations/impl';
import { UserAnswerRepositoryImpl } from './repositories/user-answer/impl';
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
  OGP_QUEUE: Queue;
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

  const recommendationRepository = new RecommendRepositoryImpl(env.DB);
  const userAnswerRepository = new UserAnswerRepositoryImpl(env.DB);
  const exlusionRepository = new ExclusionRepositoryImpl(env.DB);
  const recommendationController = new RecommendController(
    userAnswerRepository,
    recommendationRepository,
    orgsRepository,
    questionRepository,
    visitRepository,
    exlusionRepository,
    userTokenController,
    env.OGP_QUEUE,
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
    recommendationRepository,
    userAnswerRepository,
    recommendationController,
    exlusionRepository,
  };
};

const app = new Hono<HonoEnv>();

app.use(
  '*',
  cors({
    origin(origin) {
      return origin.includes('//localhost') ||
        origin.includes('irodori-newcomer2023')
        ? origin
        : 'https://irodori-newcomer2023.pages.dev';
    },
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
);

app.post('/migrate', async (ctx) => {
  const {
    userRepository,
    visitRepository,
    visitTokenRepository,
    visitController,
    recommendationRepository,
    userAnswerRepository,
    exlusionRepository,
  } = createApplication(ctx.env);

  await userRepository.migrate();
  await visitRepository.migrate();
  await visitTokenRepository.migrate();

  await visitController.registerAll();

  await recommendationRepository.migrate();
  await userAnswerRepository.migrate();

  await exlusionRepository.migrate();

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

app.get('/visits', async (ctx) => {
  const { visitController } = createApplication(ctx.env);
  return visitController.getAllVisit(ctx);
});

app.post('/visits/:token', async (ctx) => {
  const { visitController } = createApplication(ctx.env);
  return visitController.recordVisit(ctx);
});

app.put('/recommendation', async (ctx) => {
  const { recommendationController } = createApplication(ctx.env);
  return recommendationController.diagnose(ctx);
});

app.get('/recommendation', async (ctx) => {
  const { recommendationController } = createApplication(ctx.env);
  return recommendationController.getRecommend(ctx);
});

app.delete('/recommendation/:orgId', async (ctx) => {
  const { recommendationController } = createApplication(ctx.env);
  return recommendationController.excludeOrg(ctx);
});

app.patch('/recommendation/:orgId', async (ctx) => {
  const { recommendationController } = createApplication(ctx.env);
  return recommendationController.excludeOrg(ctx);
});
export default app;

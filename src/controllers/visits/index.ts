import { Context } from 'hono';
// eslint-disable-next-line import/no-unresolved
import { HTTPException } from 'hono/http-exception';
import { HonoEnv } from '../..';
import { Visit } from '../../models/visit';
import { NewVisitToken } from '../../models/visit-token';
import { OrgnizationRepository } from '../../repositories/orgs/repository';
import {
  NoVisitTokenError,
  VisitTokenRepository,
} from '../../repositories/visit-token/repository';
import { VisitRepository } from '../../repositories/visits/repository';
import { operations } from '../../schema';
import { UserTokenController } from '../users/token';

const recordVisitResponse =
  operations['post-visits-token'].responses[201].content['application/json'];

const getAllVisitResponse =
  operations['get-visits'].responses[200].content['application/json'];
export class VisitController {
  constructor(
    private userTokenController: UserTokenController,
    private visitRepo: VisitRepository,
    private visitTokenRepo: VisitTokenRepository,
    private orgsRepo: OrgnizationRepository,
  ) {}

  static toVisitResponse(visit: Visit) {
    return {
      id: visit.generatedId,
      orgId: visit.orgId,
      visitedAt: visit.visitedAt.toISO(),
    };
  }

  async recordVisit(ctx: Context<HonoEnv, '/visit/:token'>): Promise<Response> {
    const userToken = UserTokenController.getTokenFromHeader(ctx);
    const userId = await this.userTokenController.parseToId(userToken);

    try {
      const visitToken = await this.visitTokenRepo.findByToken(
        ctx.req.param('token'),
      );

      const newVisit = visitToken.createVisit(userId);
      const visit = await this.visitRepo.createVisit(newVisit);

      const visitResponse = VisitController.toVisitResponse(visit);

      return ctx.json(recordVisitResponse.parse(visitResponse));
    } catch (e) {
      // TODO: イベントの開始に合わせる
      if (e instanceof NoVisitTokenError) {
        throw new HTTPException(404);
      }

      throw new HTTPException(500);
    }
  }

  async getAllVisit(ctx: Context<HonoEnv>): Promise<Response> {
    const userToken = UserTokenController.getTokenFromHeader(ctx);
    const userId = await this.userTokenController.parseToId(userToken);

    const visitList = await this.visitRepo.getAllVisit(userId);
    const response = visitList.map(VisitController.toVisitResponse);

    return ctx.json(getAllVisitResponse.parse(response));
  }

  async registerAll() {
    const orgList = await this.orgsRepo.getAll();
    for (const { id } of orgList) {
      const newToken = new NewVisitToken(id);
      try {
        await this.visitTokenRepo.storeToken(newToken);
      } catch {}
    }
  }
}

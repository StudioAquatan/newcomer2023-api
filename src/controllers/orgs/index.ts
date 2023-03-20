import { Context } from 'hono';
import { HonoEnv } from '../..';
import { Organization } from '../../models/org';
import { OrgnizationRepository } from '../../repositories/orgs/repository';
import { operations } from '../../schema';

export class OrganizationController {
  constructor(private orgsRepo: OrgnizationRepository) {}

  static toResponse(org: Organization) {
    return {
      id: org.id,
      fullName: org.fullName,
      shortName: org.shortName ?? org.fullName,
      shortDescription: org.shortDescription ?? '',
      logo: org.logo ?? undefined,
      logoFocus: org.logoFocus,
      stampBackground: org.stampBackground ?? undefined,
      stampColor: org.stampColor ?? undefined,
      altLogo: org.altLogo ?? undefined,
      description: org.description,
      location: org.location ?? undefined,
      fees: org.fees ?? undefined,
      activeDays: org.activeDays ?? undefined,
      links: org.links ?? undefined,
    };
  }

  async getOrgsList(ctx: Context<HonoEnv>): Promise<Response> {
    const orgs = await this.orgsRepo.getAll();

    const responseType =
      operations['get-orgs'].responses[200].content['application/json'];
    ctx.header('Cache-Control', 'public, max-age=3600');
    return ctx.json(
      responseType.parse(orgs.map(OrganizationController.toResponse)),
    );
  }
}

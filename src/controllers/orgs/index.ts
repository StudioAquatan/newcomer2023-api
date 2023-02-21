import { z } from 'zod';
import { Organization } from '../../models/org';
import { OrgnizationRepository } from '../../repositories/orgs/repository';
import { operations } from '../../schema';

const orgsList =
  operations['get-orgs'].responses[200].content['application/json'];
export class OrganizationController {
  constructor(private orgsRepo: OrgnizationRepository) {}

  static toResponse(org: Organization) {
    return {
      id: org.id,
      fullName: org.fullName,
      shortName: org.shortName ?? org.fullName,
      shortDescription: org.shortDescription ?? '',
      logo: org.logo ?? undefined,
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

  async getOrgsList(): Promise<z.TypeOf<typeof orgsList>> {
    const orgs = await this.orgsRepo.getAll();
    return orgs.map(OrganizationController.toResponse);
  }
}

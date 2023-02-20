import { Organization } from '../../models/org';
import { OrgnizationRepository } from './repository';

interface NewtImage {
  src: string;
  width: number;
  height: number;
}

interface NewtContent {
  _id: string;
  _sys: {
    createdAt: string;
  };
  fullName: string;
  shortName: string;
  description: string;
  shortDescription: string;
  logo?: NewtImage;
  altLogo: {
    value: string;
  };
  stampBackground?: NewtImage;
  stampColor: string;
  location: string;
  fees: string;
  activeDays: string;
  links: string;
  recommendSource: string;
}

interface NewtContentsResponse {
  skip: number;
  limit: number;
  total: number;
  items: NewtContent[];
}

export class OrgnizationRepositoryImpl implements OrgnizationRepository {
  constructor(
    private spaceUid: string,
    private appUid: string,
    private apiKey: string,
  ) {}

  private async fetchFromCDN(): Promise<NewtContentsResponse> {
    const url = `https://${this.spaceUid}.cdn.newt.so/v1/${this.appUid}/orgnization?limit=100&depth=2`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    return await response.json<NewtContentsResponse>();
  }

  private newtToModel(content: NewtContent): Organization {
    return new Organization(
      content._id,
      content.fullName,
      content.shortName || null,
      content.shortDescription || null,
      content.description || null,
      content.logo ?? null,
      content.stampBackground ?? null,
      content.stampColor || null,
      content.altLogo.value || null,
      content.location || null,
      content.fees || null,
      content.activeDays || null,
      content.links.split('\n').filter((l) => !!l),
      content.recommendSource,
    );
  }

  async getAll(): Promise<Organization[]> {
    const response = await this.fetchFromCDN();
    return response.items.map(this.newtToModel);
  }

  async getById(id: string): Promise<Organization> {
    const orgs = await this.getAll();
    const org = orgs.find(({ id: orgId }) => orgId === id);

    if (!org) {
      throw new Error('orgs not found');
    }

    return org;
  }
}

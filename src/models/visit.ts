import { DateTime } from 'luxon';

export class Visit {
  constructor(
    public readonly userId: string,
    public readonly orgId: string,
    public readonly visitedAt: DateTime,
  ) {}

  get generatedId() {
    return `${this.userId}-${this.orgId}`;
  }
}

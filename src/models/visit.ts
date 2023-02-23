import { DateTime } from 'luxon';

class VisitBase {
  constructor(
    public readonly userId: string,
    public readonly orgId: string,
    public readonly visitedAt: DateTime,
  ) {}

  get generatedId() {
    return `${this.userId}-${this.orgId}`;
  }
}

const newVisit = Symbol();
export class NewVisit extends VisitBase {
  constructor(public readonly userId: string, public readonly orgId: string) {
    super(userId, orgId, DateTime.utc());
  }

  [newVisit] = null;
}

const visit = Symbol();
export class Visit extends VisitBase {
  [visit] = null;
}

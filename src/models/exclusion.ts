export class Exclusion {
  constructor(public userId: string, public orgId: string) {}

  match(orgId: string) {
    return orgId === this.orgId;
  }
}

export class UncommitedExclusion extends Exclusion {}

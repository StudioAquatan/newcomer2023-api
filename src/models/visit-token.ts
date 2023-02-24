import { v4 } from 'uuid';
import { NewVisit } from './visit';

class VisitTokenBase {
  constructor(public readonly orgId: string, public readonly token: string) {}
}

export class NewVisitToken extends VisitTokenBase {
  constructor(public readonly orgId: string) {
    super(orgId, v4());
  }
}

export class VisitToken extends VisitTokenBase {
  validate(token: string): boolean {
    return token === this.token;
  }

  createVisit(userId: string): NewVisit {
    return new NewVisit(userId, this.orgId);
  }
}

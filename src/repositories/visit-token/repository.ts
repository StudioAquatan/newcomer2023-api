import { NewVisitToken, VisitToken } from '../../models/visit-token';

export class NoVisitTokenError {}

export interface VisitTokenRepository {
  storeToken(newToken: NewVisitToken): Promise<VisitToken>;
  findByToken(token: string): Promise<VisitToken>;
}

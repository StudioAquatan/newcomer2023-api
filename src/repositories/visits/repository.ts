import { Visit } from '../../models/visit';

export class AlreadyVisitedException {}

export interface VisitRepository {
  createVisit(userId: string, orgId: string): Promise<Visit>;
  getAllVisit(userId: string): Promise<Visit[]>;
}

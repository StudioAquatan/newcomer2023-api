import { NewVisit, Visit } from '../../models/visit';

export class AlreadyVisitedException {}

export interface VisitRepository {
  createVisit(visit: NewVisit): Promise<Visit>;
  getAllVisit(userId: string): Promise<Visit[]>;
}

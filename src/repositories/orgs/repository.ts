import { Organization } from '../../models/org';

export interface OrgnizationRepository {
  getAll(): Promise<Organization[]>;
  getById(id: string): Promise<Organization>;
}

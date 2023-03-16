import { Exclusion, UncommitedExclusion } from '../../models/exclusion';

export class AlreadyExcludedError {}

export interface ExclusionRepository {
  create(exclusion: UncommitedExclusion): Promise<Exclusion>;
  delete(exclusion: Exclusion): Promise<void>;
  getByUser(userId: string): Promise<Exclusion[]>;
}

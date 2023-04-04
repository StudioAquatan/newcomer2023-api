import { Reward } from '../../models/reward';

export interface RewardsRepository {
  save(reward: Reward): Promise<Reward>;
  getByUserId(userId: string): Promise<Reward[]>;
  delete(reward: Reward): Promise<void>;
}

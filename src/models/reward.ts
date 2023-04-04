import { v4 } from 'uuid';
import { MaxReward, VisitCountForReward } from '../config';
import { SimpleRecommendation } from './recommendations';
import { Visit } from './visit';

export class TooManyRewardError {}
export class InsufficientVisitError {}
export class InvalidRewardTokenError {}

export class Reward {
  constructor(
    public readonly userId: string,
    public readonly amount: number,
    public readonly consumed: boolean,
    public readonly token: string,
  ) {}

  static create(
    recommendation: SimpleRecommendation,
    visits: Visit[],
    createdRewards: Reward[],
    userId: string,
    amount = 1,
  ) {
    const totalAmount = createdRewards.reduce(
      (num, { amount, consumed }) => (consumed ? num + amount : num),
      0,
    );
    if (totalAmount >= MaxReward) {
      throw new TooManyRewardError();
    }

    if (amount <= 0) {
      throw new Error('Invalid range');
    }

    const visitCount = recommendation.orgs.filter(({ orgId }) =>
      visits.some(({ orgId: visitId }) => visitId === orgId),
    ).length;

    if (visitCount < (totalAmount + amount) * VisitCountForReward) {
      throw new InsufficientVisitError();
    }

    return new Reward(userId, amount, false, v4());
  }

  consume(token: string) {
    if (token !== this.token || this.consumed) {
      throw new InvalidRewardTokenError();
    }

    return new Reward(this.userId, this.amount, true, token);
  }
}

import {
  InitialRecommendation,
  SimpleRecommendation,
  UncommitedRecommendation,
} from '../../models/recommendations';

export class NoRecommendError extends Error {
  constructor(public msg: string) {
    super(msg);
  }
}

export interface RecommendRepository {
  insertRecommend(
    initial: InitialRecommendation,
  ): Promise<SimpleRecommendation>;

  fetchRecommend(userId: string): Promise<SimpleRecommendation>;

  renewRecommend(
    uncommited: UncommitedRecommendation,
  ): Promise<SimpleRecommendation>;
}

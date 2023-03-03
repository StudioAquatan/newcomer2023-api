import {
  InitialRecommendation,
  SimpleRecommendation,
  UncommitedRecommendation,
} from '../../models/recommendations';

export interface RecommendRepository {
  insertRecommend(
    initial: InitialRecommendation,
  ): Promise<SimpleRecommendation>;

  getRecommend(userId: string): Promise<SimpleRecommendation>;

  renewRecommend(
    uncommited: UncommitedRecommendation,
  ): Promise<SimpleRecommendation>;
}

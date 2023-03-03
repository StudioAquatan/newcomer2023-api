import { v4 as uuid } from 'uuid';
import {
  SimpleRecommendationItem,
  InitialRecommendation,
} from '../../models/recommendations';
import { RecommendRepositoryImpl } from './impl';

const { __D1_BETA__DB } = getMiniflareBindings();

describe('Recommmendation Repository', () => {
  const impl = new RecommendRepositoryImpl(__D1_BETA__DB);

  const userId1 = uuid();
  const userId2 = uuid();

  // おすすめ団体の生成
  const recommendList: SimpleRecommendationItem[] = [];
  for (let i = 0; i < 10; i++) {
    const recommendItem = new SimpleRecommendationItem(i.toString(), i * 10);
    recommendList.push(recommendItem);
  }

  // 診断結果の生成
  const recommendation = new InitialRecommendation(userId1, recommendList);

  beforeEach(async () => {
    await impl.migrate(); // テーブル生成
    await impl.insertRecommend(recommendation); // 診断結果を1つ挿入
  });

  afterEach(async () => {
    await __D1_BETA__DB.exec('DELETE FROM recommendation');
  });

  test('Insert recommendation', async () => {
    const initial = new InitialRecommendation(userId2, recommendList);
    const inserted = await impl.insertRecommend(initial);
    expect(inserted.userId).toBe(userId2);

    const orgs = inserted.orgs;
    for (const [i, org] of orgs.entries()) {
      expect(org.orgId).toBe(recommendList[i].orgId);
      expect(org.coefficient).toBe(recommendList[i].coefficient);
    }

    expect(inserted.ignoreRemains).toBe(5);
    expect(inserted.renewRemains).toBe(5);
  });

  test('Get recommendation', async () => {
    const stored = await impl.getRecommend(userId1);
    expect(stored.userId).toBe(userId1);

    const orgs = stored.orgs;
    for (const [i, org] of orgs.entries()) {
      expect(org.orgId).toBe(recommendList[i].orgId);
      expect(org.coefficient).toBe(recommendList[i].coefficient);
    }

    expect(stored.ignoreRemains).toBe(5);
    expect(stored.renewRemains).toBe(5);
  });

  test('Renew recommendation', async () => {
    recommendList.reverse(); // 診断結果を反転
    const uncommited = recommendation.renewRecommend(recommendList);
    if (uncommited === null) {
      console.log('No more updates available');
      return;
    }

    const updated = await impl.renewRecommend(uncommited);

    const orgs = updated.orgs;
    for (const [i, org] of orgs.entries()) {
      expect(org.orgId).toBe(recommendList[i].orgId);
      expect(org.coefficient).toBe(recommendList[i].coefficient);
    }

    expect(updated.ignoreRemains).toBe(5);
    expect(updated.renewRemains).toBe(4);
  });
});

import { QuestionResult } from '../../models/user-answer';
import { RecommendController } from './matching';

// 配列をシャッフルする関数
const shuffle = <T>(before: T[]) => {
  const after = Array.from(before);

  for (let i = after.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [after[i], after[j]] = [after[j], after[i]];
  }

  return after;
};

it('Diagnostic Algorithm', () => {
  const userAnswer = [3, 1, 5, 1, 2]; // ユーザの回答

  // 質問IDが奇数の回答結果を生成
  const userResult: QuestionResult[] = [];
  for (let i = 0; i < userAnswer.length; i++) {
    const result = new QuestionResult(String(2 * i + 1), userAnswer[i]);
    userResult.push(result);
  }

  // 配列をシャッフル
  // メソッド内で昇順にソートされるかテスト
  const shuffled = shuffle<QuestionResult>(userResult);

  const ctrler = new RecommendController();

  // メソッドを呼び出して診断
  const recommendList = ctrler.diagnose(shuffled);

  expect(recommendList.ignoreRemains).toBe(5);
  expect(recommendList.renewRemains).toBe(5);

  const orgs = recommendList.orgs;

  for (const org of orgs) {
    // 相性とスタンプカードの位置
    switch (Number(org.id)) {
      case 3:
        expect(org.coefficient).toBe(10);
        expect(org.stampSlot).toBe(2);
        break;
      case 4:
        expect(org.coefficient).toBe(8);
        expect(org.stampSlot).toBe(0);
        break;
      case 5:
        expect(org.coefficient).toBe(9);
        expect(org.stampSlot).toBe(1);
        break;
      default:
        expect(org.stampSlot).toBe(-1);
        break;
    }

    expect(org.isVisited).toBe(false);
    expect(org.isExcluded).toBe(false);
  }
});

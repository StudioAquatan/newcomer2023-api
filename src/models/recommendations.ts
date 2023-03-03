import { Organization } from './org';
import { Question } from './question';
import { QuestionResult } from './user-answer';

// APIのスキーマとDB上の表現が異なるため別々のクラスを定義
// 熟考の末,共通部分の抽象化は断念

export class SimpleRecommendationItem {
  constructor(
    public readonly orgId: string,
    public readonly coefficient: number,
  ) {}
}

// 診断結果のDB上の表現
export class SimpleRecommendation {
  constructor(
    public readonly userId: string,
    public readonly orgs: SimpleRecommendationItem[],
    public readonly ignoreRemains: number = 5,
    public readonly renewRemains: number = 5,
  ) {}

  renewRecommend(
    newRecommend: SimpleRecommendationItem[],
  ): UncommitedRecommendation | null {
    if (this.renewRemains > 0) {
      return new UncommitedRecommendation(
        this.userId,
        newRecommend,
        this.ignoreRemains,
        this.renewRemains - 1,
      );
    }

    return null;
  }
}

const initialMarker = Symbol();

export class InitialRecommendation extends SimpleRecommendation {
  [initialMarker] = null;

  constructor(userId: string, orgs: SimpleRecommendationItem[]) {
    super(userId, orgs, 5, 5);
  }
}

const uncommitMarker = Symbol();

export class UncommitedRecommendation extends SimpleRecommendation {
  [uncommitMarker] = null;

  constructor(
    userId: string,
    orgs: SimpleRecommendationItem[],
    ignoreRemains: number,
    renewRemains: number,
  ) {
    super(userId, orgs, ignoreRemains, renewRemains);
  }
}

// おすすめ団体(スタンプ)
export class RecommendationItem {
  constructor(
    public readonly org: Organization,
    public readonly coefficient: number,
    public readonly isVisited: boolean = false,
    public readonly isExcluded: boolean = false,
    public stampSlot: number = -1, // 相性でソートしてから上書きする
  ) {}
}

// おすすめ団体リスト
export class Recommendation {
  constructor(
    public readonly orgs: RecommendationItem[],
    public readonly ignoreRemains: number = 5,
    public readonly renewRemains: number = 5,
  ) {}
}

/* 以下はテスト用の記述 */

const numCell = 3; // スタンプカードのマスの数

// 診断アルゴリズムの単体テスト用
// できるだけ記述を一致させるためメソッドとはしなかった
export const diagnose = (
  userAnswerList: QuestionResult[],
  orgList: Organization[],
  questionList: Question[],
) => {
  // おすすめ団体リスト
  const recommendList: RecommendationItem[] = [];

  for (const org of orgList) {
    // ユーザの回答結果を配列化
    const orgAnswerList = org.recommendSource.split(',').map(Number);

    let affinity = 0; // 団体との相性
    for (const userAnswer of userAnswerList) {
      const formIndex = getIndexfromId(userAnswer, questionList);
      if (formIndex === -1) {
        console.log('Unknown Question');
        return undefined;
      }

      // 回答結果の差の絶対値を加える
      affinity += Math.abs(userAnswer.answer - orgAnswerList[formIndex]);
    }

    const recommendItem = new RecommendationItem(
      org,
      affinity,
      false, // isVisited
      false, // isExecuted
      -1, // stampSlot
    );

    recommendList.push(recommendItem);
  }

  // 相性の昇順にソート
  recommendList.sort((a, b) => {
    return a.coefficient - b.coefficient;
  });

  //スタンプカードの配置
  for (let cell = 0; cell < numCell; cell++) {
    recommendList[cell].stampSlot = cell;
  }

  const recommendation = new Recommendation(
    recommendList,
    5, // igonoreRemains
    5, // renewRemains
  );

  return recommendation;
};

const getIndexfromId = (
  userAnswer: QuestionResult,
  questionList: Question[],
) => {
  const userQuestionId = userAnswer.questionId;

  // 質問一覧を走査してIDが一致する質問を探す
  for (const question of questionList) {
    if (userQuestionId === question.id) {
      return question.formIndex;
    }
  }

  return -1; // IDが一致する質問が見つからなかった
};

import { RecommendController } from '../controllers/recommendation/matching';
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
    public numIgnore: number = 0,
    public numRenew: number = 0,
  ) {}

  renewRecommend(
    newRecommend: RecommendationItem[],
  ): UncommitedRecommendation | undefined {
    // 診断回数の確認
    if (this.numRenew >= 5) {
      return undefined;
    }

    return new UncommitedRecommendation(
      this.userId,
      SimpleRecommendation.toSimpleRecommendList(newRecommend),
      this.numIgnore,
      this.numRenew + 1,
    );
  }

  // RecomendationItem[]をSimpleRecommendationItem[]に変換するメソッド
  static toSimpleRecommendList(
    recommendList: RecommendationItem[],
  ): SimpleRecommendationItem[] {
    const simpleList = recommendList.map((recommendItem) => {
      const { org, coefficient } = recommendItem;
      const simpleItem = new SimpleRecommendationItem(org.id, coefficient);
      return simpleItem;
    });

    return simpleList;
  }
}

const initialMarker = Symbol();

export class InitialRecommendation extends SimpleRecommendation {
  [initialMarker] = null;

  constructor(userId: string, recommendList: RecommendationItem[]) {
    super(
      userId,
      // HACK: クラスメソッドを継承させないようにしたい
      InitialRecommendation.toSimpleRecommendList(recommendList),
      /* numIgnore = */ 0,
      /* numRenew = */ 0,
    );
  }
}

const uncommitMarker = Symbol();

export class UncommitedRecommendation extends SimpleRecommendation {
  [uncommitMarker] = null;

  constructor(
    userId: string,
    orgs: SimpleRecommendationItem[],
    numIgnore: number,
    numRenew: number,
  ) {
    super(userId, orgs, numIgnore, numRenew);
  }
}

// おすすめ団体(スタンプ)
export class RecommendationItem {
  constructor(
    public readonly org: Organization | Pick<Organization, 'id'>,
    public readonly coefficient: number,
    public isVisited: boolean = false,
    public isExcluded: boolean = false,
    public stampSlot: number = -1,
  ) {}
}

// おすすめ団体リスト
export class Recommendation {
  constructor(
    public readonly orgs: RecommendationItem[],
    public numIgnore: number = 0,
    public numRenew: number = 0,
  ) {}

  static diagnose(
    userAnswerList: QuestionResult[],
    orgList: Organization[],
    questionList: Question[],
  ): RecommendationItem[] | undefined {
    // おすすめ団体リスト
    const recommendList: RecommendationItem[] = [];

    for (const org of orgList) {
      // ユーザの回答結果を配列化
      const orgAnswerList = org.recommendSource.split(',').map(Number);

      let affinity = 0; // 団体との相性
      for (const userAnswer of userAnswerList) {
        const formIndex = Recommendation.getIndexFromId(
          userAnswer,
          questionList,
        );
        if (formIndex === -1) {
          console.error('Unknown Question');
          return undefined;
        }

        // 回答結果の差の絶対値を加える
        affinity += Math.abs(userAnswer.answer - orgAnswerList[formIndex]);
      }

      const recommendItem = new RecommendationItem(
        org,
        affinity,
        /* isVisited = */ false,
        /* isExcluded = */ false,
        /* stampSlot = */ -1,
      );

      recommendList.push(recommendItem);
    }

    Recommendation.arrangeStampSlot(recommendList);

    return recommendList;
  }

  // questionIdに対応するformIndex求めるメソッド
  // クラスメソッドから呼び出されるためクラスメソッドとしている
  private static getIndexFromId(
    userAnswer: QuestionResult,
    questionList: Question[],
  ) {
    const userQuestionId = userAnswer.questionId;

    // 質問一覧を走査してIDが一致する質問を探す
    for (const question of questionList) {
      if (userQuestionId === question.id) {
        return question.formIndex;
      }
    }

    return -1; // IDが一致する質問が見つからなかった
  }

  // スタンプカードの配置を決めるメソッド
  static arrangeStampSlot(recommendList: RecommendationItem[]) {
    // おすすめ団体リストを相性の昇順にソート
    recommendList.sort((a, b) => {
      return a.coefficient - b.coefficient;
    });

    // テスト時は団体数よりマスの数の方が少ない
    const numCell =
      recommendList.length < RecommendController.numCell
        ? recommendList.length
        : RecommendController.numCell;

    for (let cell = 0; cell < numCell; cell++) {
      recommendList[cell].stampSlot = cell;
    }
  }
}

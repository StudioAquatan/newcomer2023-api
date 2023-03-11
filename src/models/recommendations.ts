import { RecommendController } from '../controllers/recommendation/matching';
import { Organization } from './org';
import { Question } from './question';
import { QuestionResult } from './user-answer';
import { Visit } from './visit';

// 新題回数が上限に達した時
export class DiagnosisExhaustedError {}
// 回答結果に未知の質問が含まれていた時
export class UnknownQuestionError {}

// APIのスキーマとDB上の表現が異なるため別々のクラスを定義
// 熟考の末,共通部分の抽象化は断念

export class SimpleRecommendItem {
  constructor(
    public readonly orgId: string,
    public readonly coefficient: number,
  ) {}
}

// 診断結果のDB上の表現
export class SimpleRecommendation {
  constructor(
    public readonly userId: string,
    public readonly orgs: SimpleRecommendItem[],
    public readonly ignoreCount: number = 0,
    public readonly renewCount: number = 0,
  ) {}

  renewRecommend(newRecommend: RecommendItem[]): UncommitedRecommendation {
    // 診断回数の確認
    if (this.renewCount >= 5) {
      throw new DiagnosisExhaustedError();
    }

    return new UncommitedRecommendation(
      this.userId,
      SimpleRecommendation.toSimpleRecommendList(newRecommend),
      this.ignoreCount,
      this.renewCount + 1,
    );
  }

  // RecomendItem[]をSimpleRecommendItem[]に変換するメソッド
  static toSimpleRecommendList(
    recommendList: RecommendItem[],
  ): SimpleRecommendItem[] {
    const simpleList = recommendList.map((recommendItem) => {
      const { org, coefficient } = recommendItem;
      const simpleItem = new SimpleRecommendItem(org.id, coefficient);
      return simpleItem;
    });

    return simpleList;
  }
}

const initialMarker = Symbol();

export class InitialRecommendation extends SimpleRecommendation {
  [initialMarker] = null;

  constructor(userId: string, recommendList: RecommendItem[]) {
    super(
      userId,
      // HACK: クラスメソッドを継承させないようにしたい
      InitialRecommendation.toSimpleRecommendList(recommendList),
      /* ignoreCount = */ 0,
      /* renewCount = */ 0,
    );
  }
}

const uncommitMarker = Symbol();

export class UncommitedRecommendation extends SimpleRecommendation {
  [uncommitMarker] = null;

  constructor(
    userId: string,
    orgs: SimpleRecommendItem[],
    ignoreCount: number,
    renewCount: number,
  ) {
    super(userId, orgs, ignoreCount, renewCount);
  }
}

// おすすめ団体(スタンプ)
export class RecommendItem {
  constructor(
    public readonly org: Organization | Pick<Organization, 'id'>,
    public readonly coefficient: number,
    public readonly isVisited: boolean = false,
    public readonly isExcluded: boolean = false,
    public stampSlot: number = -1,
  ) {}
}

// おすすめ団体リスト
export class Recommendation {
  constructor(
    public readonly orgs: RecommendItem[],
    public readonly ignoreCount: number = 0,
    public readonly renewCount: number = 0,
  ) {}

  static diagnose(
    userAnswerList: QuestionResult[],
    orgList: Organization[],
    questionList: Question[],
  ): RecommendItem[] {
    // おすすめ団体リスト
    const recommendList: RecommendItem[] = [];

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
          throw new UnknownQuestionError();
        }

        // 回答結果の差の絶対値を加える
        affinity += Math.abs(userAnswer.answer - orgAnswerList[formIndex]);
      }

      recommendList.push(
        new RecommendItem(
          org,
          affinity,
          /* isVisited = */ false,
          /* isExcluded = */ false,
          /* stampSlot = */ -1,
        ),
      );
    }

    Recommendation.arrangeStampSlot(recommendList);
    return recommendList;
  }

  // questionIdに対応するformIndex求めるメソッド
  private static getIndexFromId(
    userAnswer: QuestionResult,
    questionList: Question[],
  ): number {
    const userQuestionId = userAnswer.questionId;

    // 質問一覧からIDが一致する質問を探す
    const question = questionList.find((question) => {
      return userQuestionId === question.id;
    });

    if (!question) {
      // IDが一致する質問が見つからなかった
      return -1;
    } else {
      return question.formIndex;
    }
  }

  /* おすすめ団体に対するメソッド群 */

  // 団体の詳細情報を含んだ診断結果を返すメソッド
  replaceOrgsContent(orgList: Organization[]): Recommendation {
    const replaced = this.orgs.map((item) => {
      const org = orgList.find((org) => {
        return org.id === item.org.id;
      });

      if (!org) {
        // IDが一致する団体が見つからなかった
        return item;
      } else {
        return new RecommendItem(
          org,
          item.coefficient,
          item.isVisited,
          item.isExcluded,
          item.stampSlot,
        );
      }
    });

    return new Recommendation(replaced, this.ignoreCount, this.renewCount);
  }

  // 訪問済みの団体を調べるメソッド
  checkVisitedOrg(visitList: Visit[]): Recommendation {
    const checked = this.orgs.map((item) => {
      // 訪問記録の有無を調べる
      const visit = visitList.find((visit) => {
        return item.org.id === visit.orgId;
      });

      // TODO: 団体除外の有無を調べる

      // TODO: 団体除外も含めた4通りの分岐
      if (!visit) {
        return item;
      } else {
        return new RecommendItem(
          item.org,
          item.coefficient,
          item.isExcluded,
          true,
          item.stampSlot,
        );
      }
    });

    return new Recommendation(checked, this.ignoreCount, this.renewCount);
  }

  // スタンプカードの配置を決めるメソッド
  static arrangeStampSlot(recommendList: RecommendItem[]) {
    // おすすめ団体リストを相性の昇順にソート
    recommendList.sort((a, b) => {
      return a.coefficient - b.coefficient;
    });

    // テスト時は団体数よりマスの数の方が多い
    const numCell =
      recommendList.length < RecommendController.numCell
        ? recommendList.length
        : RecommendController.numCell;

    let slot = 0;
    for (const recommendItem of recommendList) {
      // 除外された団体は配置しない
      if (recommendItem.isExcluded) {
        continue;
      }

      recommendItem.stampSlot = slot++;
      if (numCell <= slot) {
        break;
      }
    }
  }
}

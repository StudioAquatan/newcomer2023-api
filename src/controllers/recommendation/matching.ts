import { RecommendationItem, Recommendation } from '../../models/orgs';
import { QuestionResult } from '../../models/qa';

// 団体のアンケート回答結果のみ
// 6団体の前半10問の結果を抽出
const orgAnswerList = [
  [1, 5, 5, 5, 5, 2, 2, 5, 2, 1], // ワンダーフォーゲル部
  [4, 5, 5, 5, 4, 1, 1, 4, 3, 5], // Xcape
  [5, 5, 5, 5, 5, 1, 5, 2, 3, 1], // ぽっけ
  [4, 5, 5, 5, 1, 1, 4, 3, 5, 1], // 茶道部
  [5, 5, 5, 1, 4, 1, 2, 2, 4, 1], // ギター部
  [5, 5, 5, 5, 5, 3, 2, 1, 3, 4], // ソフトテニス部
];

// 1団体の回答結果を作成する
function makeOrgResult(orgID: number): QuestionResult[] {
  orgID = orgID % orgAnswerList.length;

  // 回答結果を格納する配列
  const QandA: QuestionResult[] = [];

  // 回答を生成して追加
  for (const [questionID, answer] of orgAnswerList[orgID].entries()) {
    const result = new QuestionResult(questionID.toString(), answer);
    QandA.push(result);
  }

  return QandA;
}

// 1団体の回答結果
type OrganizationResult = {
  orgID: string;
  QandA: QuestionResult[];
};

export class RecommendController {
  private static readonly numCell = 3; // スタンプカードのマスの数
  private orgResultList: OrganizationResult[]; // 各団体のアンケート回答結果

  constructor() {
    this.orgResultList = [];

    // 全体の回答結果を生成する
    for (let orgID = 0; orgID < orgAnswerList.length; orgID++) {
      const QandA = makeOrgResult(orgID);
      this.orgResultList.push({
        orgID: orgID.toString(),
        QandA: QandA,
      });
    }
  }

  // ユーザの回答結果を受け取って診断結果を返すメソッド
  diagnose(userResult: QuestionResult[]) {
    // ユーザの回答結果を質問IDの昇順にソートする
    userResult.sort((a, b) => {
      return a.questionId > b.questionId ? 1 : -1;
    });

    // おすすめ団体リスト
    const recommendList: RecommendationItem[] = [];

    for (const orgResult of this.orgResultList) {
      // 団体との相性
      const affinity = this.calcAffinity(userResult, orgResult.QandA);

      const recommendItem = new RecommendationItem(
        orgResult.orgID,
        affinity,
        false, // isVisited
        false, // isExcluded
        -1, // stampSlot
      );

      recommendList.push(recommendItem);
    }

    // 相性の降順にソート
    recommendList.sort((a, b) => {
      return a.coefficient < b.coefficient ? 1 : -1;
    });

    //スタンプカードの配置
    for (let cell = 0; cell < RecommendController.numCell; cell++) {
      recommendList[cell].stampSlot = cell;
    }

    const recommend = new Recommendation(
      recommendList,
      5, // igonoreRemains
      5, // renewRemains
    );

    return recommend;
  }

  // 2つの回答結果を受け取って類似度を返すメソッド
  // 回答結果は質問IDの昇順になっている前提
  private calcAffinity(
    userResult: QuestionResult[],
    orgResult: QuestionResult[],
  ) {
    let affinity = 0; // 団体との相性

    let userIndex = 0; // 着目しているユーザの回答結果
    let orgIndex = 0; // 着目している団体の回答結果
    while (userIndex < userResult.length) {
      const userQuestionID = userResult[userIndex].questionId;
      let isFound = false;

      while (orgIndex < orgResult.length) {
        const orgQuestionID = orgResult[orgIndex].questionId;

        if (userQuestionID === orgQuestionID) {
          affinity += userResult[userIndex].answer * orgResult[orgIndex].answer;
          isFound = true;
          break;
        }

        orgIndex++;
      }

      if (isFound) {
        userIndex++;
      } else {
        console.log('Undefiend Question ID');
        // TODO: 未知の質問ID -> 400
      }
    }

    return affinity;
  }
}

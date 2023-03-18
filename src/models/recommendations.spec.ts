import { Organization } from './org';
import { Question } from './question';
import { Recommendation } from './recommendations';
import { QuestionResult } from './user-answer';

// 団体のアンケート回答結果のみ
// 6団体の前半10問の結果を抽出
const orgAnswerList = [
  '1,5,5,5,5,2,2,5,2,1', // ワンダーフォーゲル部
  '4,5,5,5,1,1,4,3,5,1', // Xcape
  '5,5,5,5,5,1,5,2,3,1', // ぽっけ
  '5,5,5,5,5,3,2,1,3,4', // 茶道部
  '5,5,5,1,4,1,2,2,4,1', // ギター部
  '1,1,5,5,5,3,4,1,1,1', // ソフトテニス部
];

test('Diagnostic Algorithm', () => {
  // テスト用の質問数
  const numQuestin = 10;

  /* 質問一覧の生成 */
  const questionList: Question[] = [];
  for (let i = 0; i < numQuestin; i++) {
    const question = new Question(
      i.toString(),
      /* questionText */ 'question',
      /* questinType */ 'five',
      /* answers */ [],
      /* formIndex */ i,
      /* sort */ i,
    );
    questionList.push(question);
  }

  // 団体一覧の生成
  const orgList: Organization[] = [];
  for (let i = 0; i < orgAnswerList.length; i++) {
    const org = new Organization(
      i.toString(),
      'fullName',
      'shortName',
      'shortDescription',
      'description',
      /* logo = */ null,
      false,
      /* stampBackground = */ null,
      /* stampColor = */ null,
      'altLogo',
      'location',
      'fees',
      'activeDays',
      /* links = */ [],
      orgAnswerList[i],
    );

    orgList.push(org);
  }

  // ユーザの回答結果の生成
  const userAnswerList: QuestionResult[] = [];
  const userAnswerNumber = [3, 1, 5, 1, 2];

  for (let i = 0; i < numQuestin / 2; i++) {
    // ユーザはIDが奇数の質問に回答
    const questionId = i * 2 + 1;
    const userAnswer = new QuestionResult(
      questionId.toString(),
      userAnswerNumber[i],
    );
    userAnswerList.push(userAnswer);
  }

  const recommendList = Recommendation.diagnose(
    userAnswerList,
    orgList,
    questionList,
  );

  Recommendation.arrangeStampSlot(recommendList);

  if (!recommendList) {
    // 未知の質問が含まれていた場合
    return;
  }

  for (const org of recommendList) {
    // 相性とスタンプカードの位置
    switch (Number(org.org.id)) {
      case 0:
        // expect(org.coefficient).toBe(14);
        expect(org.stampSlot).toBe(5);
        break;
      case 1:
        // expect(org.coefficient).toBe(13);
        expect(org.stampSlot).toBe(4);
        break;
      case 2:
        // expect(org.coefficient).toBe(12);
        expect(org.stampSlot).toBe(3);
        break;
      case 3:
        // expect(org.coefficient).toBe(10);
        expect(org.stampSlot).toBe(2);
        break;
      case 4:
        // expect(org.coefficient).toBe(8);
        expect(org.stampSlot).toBe(0);
        break;
      case 5:
        // expect(org.coefficient).toBe(9);
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

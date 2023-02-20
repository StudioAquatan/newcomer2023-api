import { QuestionResult } from '../../models/qa';
import { RecommendController } from './matching';

/* 診断アルゴリズムのテスト */

// 指定範囲の乱数を生成する関数
const randBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 配列をシャッフルする関数
const shuffle = <T>(before: T[]) => {
  const after = Array.from(before);

  for (let i = after.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [after[i], after[j]] = [after[j], after[i]];
  }

  return after;
};

// ユーザの回答結果を生成する関数
function makeUserResult(n_question: number): QuestionResult[] {
  const userResult: QuestionResult[] = [];

  for (let questionID = 0; questionID < n_question; questionID++) {
    const result = new QuestionResult(questionID.toString(), randBetween(1, 5));
    userResult.push(result);
  }

  // 配列をシャッフル
  // メソッドで昇順にソートされるかテスト
  const shuffled = shuffle<QuestionResult>(userResult);

  // シャッフルされているか確認
  // console.log(shuffled)

  return shuffled;
}

// インスタンス生成
const ctrler = new RecommendController();

// 1ユーザの回答結果を生成
const userResult = makeUserResult(5);

// メソッドを呼び出して診断
const recommendList = ctrler.diagnose(userResult);
console.log(recommendList);

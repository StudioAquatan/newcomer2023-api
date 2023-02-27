import { Context } from 'hono';
// eslint-disable-next-line import/no-unresolved
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { HonoEnv } from '../..';
import { Organization } from '../../models/org';
import { Question } from '../../models/question';
import {
  RecommendationItem,
  Recommendation,
} from '../../models/recommendations';
import { UserAnswer } from '../../models/user-answer';
import { OrgnizationRepository } from '../../repositories/orgs/repository';
import { QuestionRepository } from '../../repositories/question/repository';
import { components, operations } from '../../schema';

export class RecommendController {
  private static readonly numCell = 9; // スタンプカードのマスの数

  constructor() {}

  static recommendationToResponse(
    recommendation: Recommendation,
  ): z.TypeOf<typeof components.schemas.Recommendation.serializer> {
    return {
      orgs: recommendation.orgs,
      ignoreRemains: recommendation.ignoreRemains,
      renewRemains: recommendation.renewRemains,
    };
  }

  // ユーザの回答結果を受け取って診断結果を返すメソッド
  async diagnose(
    context: Context<HonoEnv>,
    orgsRepository: OrgnizationRepository,
    questionRepository: QuestionRepository,
  ): Promise<Response> {
    // ユーザの回答結果を取得する
    const userAnswerList: UserAnswer[] = await context.req.json();

    // 団体の回答結果を取得する
    const orgList: Organization[] = await orgsRepository.getAll();

    // 質問一覧を取得する
    const questionList: Question[] = await questionRepository.getAllSorted();

    // おすすめ団体リスト
    const recommendList: RecommendationItem[] = [];

    for (const org of orgList) {
      // 団体の回答結果を配列化
      const orgAnswerList = org.recommendSource.split(',').map(Number);

      let affinity = 0; // 団体との相性
      for (const userAnswer of userAnswerList) {
        const formIndex = this.getIndexfromId(userAnswer, questionList);
        if (formIndex === -1) {
          throw new HTTPException(400, { message: 'Unknown Quesntion' });
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
    for (let cell = 0; cell < RecommendController.numCell; cell++) {
      recommendList[cell].stampSlot = cell;
    }

    const recommendation = new Recommendation(
      recommendList,
      5, // igonoreRemains
      5, // renewRemains
    );

    const responseType =
      operations['put-recommendation-question'].responses[200].content[
        'application/json'
      ];

    return context.json(
      responseType.parse(
        RecommendController.recommendationToResponse(recommendation),
      ),
    );
  }

  // questionIdからformIndex求めるメソッド
  private getIndexfromId(userAnswer: UserAnswer, questionList: Question[]) {
    const userQuestionId = userAnswer.questionId;

    // 質問一覧を走査してIDが一致する質問を探す
    for (const question of questionList) {
      if (userQuestionId === question.id) {
        return question.formIndex;
      }
    }

    return -1; // IDが一致する質問が見つからなかった
  }
}

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
  InitialRecommendation,
  UncommitedRecommendation,
} from '../../models/recommendations';
import { InitialUserAnswer, QuestionResult } from '../../models/user-answer';
import { OrgnizationRepository } from '../../repositories/orgs/repository';
import { QuestionRepository } from '../../repositories/question/repository';
import {
  NoRecommendError,
  RecommendRepository,
} from '../../repositories/recommendations/repository';
import { UserAnswerRepository } from '../../repositories/user-answer/repository';
import { VisitRepository } from '../../repositories/visits/repository';
import { components, operations } from '../../schema';
import { UserTokenController } from '../users/token';

// GETリクエストのレスポンス
type FullRecommendInfo = {
  recommendation: Omit<Recommendation, 'numIgnore' | 'numRenew'> & {
    ignoreRemains: number;
    renewRemains: number;
  };
  answers?: QuestionResult[];
};

export class RecommendController {
  static readonly numCell = 9; // スタンプカードのマスの数

  constructor(
    private userAnswerRepo: UserAnswerRepository,
    private recommendRepo: RecommendRepository,
  ) {}

  static recommendToResponse(
    recommendation: Recommendation,
  ): z.TypeOf<typeof components.schemas.Recommendation.serializer> {
    return {
      orgs: recommendation.orgs,
      ignoreRemains: 5 - recommendation.numIgnore,
      renewRemains: 5 - recommendation.numRenew,
    };
  }

  static questionResultToResponse(
    qa: QuestionResult,
  ): z.TypeOf<typeof components.schemas.QuestionResult.serializer> {
    return {
      questionId: qa.questionId,
      answer: qa.answer,
    };
  }

  async diagnose(
    context: Context<HonoEnv>,
    orgRepo: OrgnizationRepository,
    questionRepo: QuestionRepository,
  ): Promise<Response> {
    // ユーザID(主キー)をヘッダから取得する
    const userId = UserTokenController.getTokenFromHeader(context);

    // 診断の残り回数を確認する
    let storedRecommend = undefined;
    try {
      storedRecommend = await this.recommendRepo.fetchRecommend(userId);
      if (storedRecommend.numRenew >= 5) {
        throw new HTTPException(429, {
          message: 'No more diagnosis available',
        });
      }
    } catch (error) {
      // 初回診断時 or 診断結果の取得に失敗
      console.error(error);

      if (!(error instanceof NoRecommendError)) {
        throw new HTTPException(500);
      }
    }

    // ユーザの回答結果をボディから取得する
    const userAnswerList: QuestionResult[] = await context.req.json();
    // TODO: 学部を尋ねる質問のIDを手がかりにユーザの学部を取得する

    // 団体の回答結果を取得する
    const orgList: Organization[] = await orgRepo.getAll();
    // 質問一覧を取得する
    const questionList: Question[] = await questionRepo.getAllSorted();

    const recommendList = Recommendation.diagnose(
      userAnswerList,
      orgList,
      questionList,
    );

    if (!recommendList) {
      // IDが一致する質問が見つからなかった
      throw new HTTPException(400, { message: 'Unknown Quesntion' });
    }

    // ユーザの回答結果と診断結果をDBに保存
    let committedRecommend;
    if (!storedRecommend) {
      // 初回診断時はインスタンスを生成して挿入
      await this.userAnswerRepo.insertUserAnswer(
        new InitialUserAnswer(userId, userAnswerList),
      );

      committedRecommend = await this.recommendRepo.insertRecommend(
        new InitialRecommendation(userId, recommendList),
      );
    } else {
      // 再診断時はDBから取得したデータを更新
      // eslint-disable-next-line prettier/prettier
      const storedUserAnswer = await this.userAnswerRepo.fetchUserAnswer(userId);
      const uncommitedAnswer = storedUserAnswer.updateAnswer(userAnswerList);
      await this.userAnswerRepo.updateUserAnswer(uncommitedAnswer);

      const storedRecommend = await this.recommendRepo.fetchRecommend(userId);
      const uncommitedRecommend = storedRecommend.renewRecommend(recommendList);
      committedRecommend = await this.recommendRepo.renewRecommend(
        // 診断の更新回数は冒頭でチェックしている
        uncommitedRecommend as UncommitedRecommendation,
      );
    }

    const recommendation = new Recommendation(
      recommendList,
      committedRecommend.numIgnore,
      committedRecommend.numRenew,
    );

    const responseType =
      operations['put-recommendation-question'].responses[200].content[
        'application/json'
      ];

    return context.json(
      responseType.parse(
        RecommendController.recommendToResponse(recommendation),
      ),
    );
  }

  // 診断結果を取得するメソッド
  async getRecommend(
    context: Context<HonoEnv>,
    orgsRepo: OrgnizationRepository,
    visitRepo: VisitRepository,
  ) {
    const userId = UserTokenController.getTokenFromHeader(context);
    // クエリパラメータの取得
    const { includeQuestions, includeOrgsContent } = context.req.query();

    // 回答結果を取得する
    let storedRecommend = undefined;
    try {
      storedRecommend = await this.recommendRepo.fetchRecommend(userId);
    } catch (error) {
      console.error(error);

      if (error instanceof NoRecommendError) {
        throw new HTTPException(404, { message: 'Not Yet Diagnosed' });
      }

      throw new HTTPException(500);
    }

    // おすすめ団体(RecommendationItem)に復元する
    const recommendList: RecommendationItem[] = [];
    for (const org of storedRecommend.orgs) {
      recommendList.push(
        new RecommendationItem(
          { id: org.orgId },
          org.coefficient,
          /* isVisited = */ false,
          /* isExcluded = */ false,
          /* stampSlot = */ -1,
        ),
      );
    }

    // 訪問済みの団体を調べる
    this.checkVisitedOrg(userId, recommendList, visitRepo);
    // TODO: isExcludedの復元

    // スタンプカードの再配置
    Recommendation.arrangeStampSlot(recommendList);

    if (includeOrgsContent) {
      // 団体の詳細を含める
      for (let i = 0; i < recommendList.length; i++) {
        const recommendItem = recommendList.shift();
        if (!recommendItem) {
          continue;
        }
        // TODO: Errorの補足
        const org: Organization = await orgsRepo.getById(recommendItem.org.id);

        // orgは読み取り専用なので新しくインスタンスを生成する
        recommendList.push(
          new RecommendationItem(
            org,
            recommendItem.coefficient,
            recommendItem.isExcluded,
            recommendItem.isExcluded,
            recommendItem.stampSlot,
          ),
        );
      }
    }

    const recommendation = new Recommendation(
      recommendList,
      storedRecommend.numIgnore,
      storedRecommend.numRenew,
    );
    const fullInfo: FullRecommendInfo = {
      recommendation: RecommendController.recommendToResponse(recommendation),
    };

    if (includeQuestions) {
      // 質問の回答を含める
      // TODO: Errorの補足
      const userAnswerList = await this.userAnswerRepo.fetchUserAnswer(userId);
      fullInfo.answers = userAnswerList.answers.map((qa) => {
        return RecommendController.questionResultToResponse(qa);
      });
    }

    const responseType =
      operations['get-recommendation'].responses[200].content[
        'application/json'
      ];

    return context.json(responseType.parse(fullInfo));
  }

  // 訪問済みの団体を調べるメソッド
  async checkVisitedOrg(
    userId: string,
    recommendList: RecommendationItem[],
    visitRepo: VisitRepository,
  ) {
    const visitList = await visitRepo.getAllVisit(userId);
    for (const visit of visitList) {
      const recommendItem = recommendList.find(({ org: org }) => {
        return org.id === visit.orgId;
      });

      if (!recommendItem) {
        break;
      }

      recommendItem.isVisited = true;
    }
  }
}

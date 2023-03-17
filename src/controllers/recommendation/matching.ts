import { Context } from 'hono';
// eslint-disable-next-line import/no-unresolved
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { HonoEnv } from '../..';
import { RecommendationMax, RecommendationMaxIgnore } from '../../config';
import { UncommitedExclusion } from '../../models/exclusion';
import { Organization } from '../../models/org';
import { Question } from '../../models/question';
import {
  RecommendItem,
  Recommendation,
  InitialRecommendation,
  SimpleRecommendation,
  UncommitedRecommendation,
} from '../../models/recommendations';
import { QuestionResult, UncommitedUserAnswer } from '../../models/user-answer';
import {
  AlreadyExcludedError,
  ExclusionRepository,
} from '../../repositories/exclusion/repository';
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
  recommendation: Omit<
    Recommendation,
    | 'ignoreCount'
    | 'renewCount'
    | 'replaceOrgsContent'
    | 'checkVisitedOrg'
    | 'applyExclusion'
  > & {
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
    private orgRepo: OrgnizationRepository,
    private questionRepo: QuestionRepository,
    private visitRepo: VisitRepository,
    private exclusionRepo: ExclusionRepository,
    private userTokenController: UserTokenController,
  ) {}

  static recommendToResponse(
    recommendation: Recommendation,
  ): z.TypeOf<typeof components.schemas.Recommendation.serializer> {
    return {
      orgs: recommendation.orgs,
      ignoreRemains: RecommendationMaxIgnore - recommendation.ignoreCount,
      renewRemains: RecommendationMax - recommendation.renewCount,
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

  async diagnose(context: Context<HonoEnv>): Promise<Response> {
    // ユーザID(主キー)をヘッダから取得する
    const userToken = UserTokenController.getTokenFromHeader(context);
    const userId = await this.userTokenController.parseToId(userToken);

    const { includeQuestions, includeOrgsContent } = context.req.query();

    // ユーザの回答結果をボディから取得する
    const requestType =
      operations['put-recommendation-question'].requestBody.content[
        'application/json'
      ];
    const userAnswerList: QuestionResult[] = requestType.parse(
      await context.req.json(),
    );

    // 団体の回答結果を取得する
    const orgList: Organization[] = await this.orgRepo.getAll();
    // 質問一覧を取得する
    const questionList: Question[] = await this.questionRepo.getAllSorted();

    let recommendList: RecommendItem[];
    try {
      recommendList = Recommendation.diagnose(
        userAnswerList,
        orgList,
        questionList,
      );
    } catch (error) {
      // 回答結果に未知の質問が含まれていた
      throw new HTTPException(400, { message: 'Unknown Quesntion' });
    }

    // 過去の診断結果を取得する
    let storedRecommend: SimpleRecommendation | null;
    try {
      storedRecommend = await this.recommendRepo.fetchRecommend(userId);
    } catch (error) {
      // 初回診断時 or 診断結果の取得に失敗
      console.error(error);
      storedRecommend = null;

      if (!(error instanceof NoRecommendError)) {
        throw new HTTPException(500);
      }
    }

    // ユーザの回答結果と診断結果をDBに記録
    let committedRecommend: SimpleRecommendation;
    if (!storedRecommend) {
      // 初回診断時はインスタンスを生成して挿入
      await this.userAnswerRepo.insertUserAnswer(
        new UncommitedUserAnswer(userId, userAnswerList),
      );

      committedRecommend = await this.recommendRepo.insertRecommend(
        new InitialRecommendation(userId, recommendList),
      );
    } else {
      // 再診断時はDBに記録されているデータを更新
      await this.userAnswerRepo.updateUserAnswer(
        new UncommitedUserAnswer(userId, userAnswerList),
      );

      const storedRecommend = await this.recommendRepo.fetchRecommend(userId);
      let uncommitedRecommend: UncommitedRecommendation;
      try {
        uncommitedRecommend = storedRecommend.renewRecommend(recommendList);
      } catch (error) {
        // 診断回数の上限に達した
        console.error(error);
        throw new HTTPException(429, {
          message: 'No more diagnosis available',
        });
      }

      committedRecommend = await this.recommendRepo.renewRecommend(
        uncommitedRecommend,
      );
    }

    const recommendation = new Recommendation(
      recommendList,
      committedRecommend.ignoreCount,
      committedRecommend.renewCount,
    );
    const proceedRecommendation = await this.postProcessRecommendation(
      recommendation,
      userId,
      !!includeOrgsContent,
      !!includeQuestions,
    );

    return context.json(proceedRecommendation);
  }

  // 診断結果を取得するメソッド
  async getRecommend(context: Context<HonoEnv>) {
    const userToken = UserTokenController.getTokenFromHeader(context);
    const userId = await this.userTokenController.parseToId(userToken);
    // クエリパラメータの取得
    const { includeQuestions, includeOrgsContent } = context.req.query();

    // 回答結果を取得する
    let storedRecommend: SimpleRecommendation;
    try {
      storedRecommend = await this.recommendRepo.fetchRecommend(userId);
    } catch (error) {
      console.error(error);

      if (error instanceof NoRecommendError) {
        throw new HTTPException(404, { message: 'Not Yet Diagnosed' });
      }

      throw new HTTPException(500);
    }

    // おすすめ団体(RecommendItem)に復元する
    const recommendList: RecommendItem[] = [];
    for (const org of storedRecommend.orgs) {
      recommendList.push(
        new RecommendItem(
          { id: org.orgId },
          org.coefficient,
          /* isVisited = */ false,
          /* isExcluded = */ false,
          /* stampSlot = */ -1,
        ),
      );
    }

    const recommendation = new Recommendation(
      recommendList,
      storedRecommend.ignoreCount,
      storedRecommend.renewCount,
    );
    const proceedRecommendation = await this.postProcessRecommendation(
      recommendation,
      userId,
      !!includeOrgsContent,
      !!includeQuestions,
    );

    return context.json(proceedRecommendation);
  }

  private async postProcessRecommendation(
    recommendation: Recommendation,
    userId: string,
    includeOrgsContent: boolean,
    includeQuestions: boolean,
  ) {
    // 除外系適用
    const exclusionList = await this.exclusionRepo.getByUser(userId);
    const visitList = await this.visitRepo.getAllVisit(userId);

    let postRecommendation = recommendation
      .applyExclusion(exclusionList)
      .checkVisitedOrg(visitList);

    // スタンプカードの再配置
    Recommendation.arrangeStampSlot(postRecommendation.orgs);

    if (includeOrgsContent) {
      // 団体の詳細を含める
      const orgList = await this.orgRepo.getAll();
      postRecommendation = postRecommendation.replaceOrgsContent(orgList);
    }

    const fullInfo: FullRecommendInfo = {
      recommendation:
        RecommendController.recommendToResponse(postRecommendation),
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

    return responseType.parse(fullInfo);
  }

  // TODO: 無駄な処理が多い
  async excludeOrg(context: Context<HonoEnv, '/recommendation/:orgId'>) {
    const userToken = UserTokenController.getTokenFromHeader(context);
    const userId = await this.userTokenController.parseToId(userToken);
    // クエリパラメータの取得
    const { includeQuestions, includeOrgsContent } = context.req.query();

    // 診断済みじゃないと受け付けない
    let storedRecommend: SimpleRecommendation;
    try {
      storedRecommend = await this.recommendRepo.fetchRecommend(userId);
    } catch (error) {
      console.error(error);

      if (error instanceof NoRecommendError) {
        throw new HTTPException(404, { message: 'Not Yet Diagnosed' });
      }

      throw new HTTPException(500);
    }

    // 団体情報を取得して突き合わせる(存在チェック)
    const orgId = context.req.param('orgId');
    try {
      await this.orgRepo.getById(orgId);
    } catch (error) {
      throw new HTTPException(404, { message: 'Org not found' });
    }

    // 除外情報を取得
    let exclusionList = await this.exclusionRepo.getByUser(userId);

    // 処理を分岐
    if (context.req.method.toLowerCase() === 'delete') {
      // 除外チェック
      if (exclusionList.length >= RecommendationMaxIgnore) {
        throw new HTTPException(429, { message: 'Exclusion limit exceeded' });
      }

      // 実際に除外DBへ
      const exclusion = new UncommitedExclusion(userId, orgId);
      try {
        const commitedExclusion = await this.exclusionRepo.create(exclusion);

        // TODO: mutable!!!!
        exclusionList.push(commitedExclusion);
      } catch (e) {
        if (e instanceof AlreadyExcludedError) {
          throw new HTTPException(400, { message: 'Already excluded' });
        }

        console.error(e);
        throw new HTTPException(500);
      }
    } else {
      // 除外解除
      const exclusion = exclusionList.find(({ orgId: id }) => id === orgId);

      if (exclusion) await this.exclusionRepo.delete(exclusion);

      // TODO: mutable!!!!
      exclusionList = exclusionList.filter(({ orgId: id }) => id !== orgId);
    }

    const recommendList: RecommendItem[] = [];
    for (const org of storedRecommend.orgs) {
      recommendList.push(
        new RecommendItem(
          { id: org.orgId },
          org.coefficient,
          /* isVisited = */ false,
          /* isExcluded = */ false,
          /* stampSlot = */ -1,
        ),
      );
    }

    const recommendation = new Recommendation(
      recommendList,
      storedRecommend.ignoreCount,
      storedRecommend.renewCount,
    );
    const proceedRecommendation = await this.postProcessRecommendation(
      recommendation,
      userId,
      !!includeOrgsContent,
      !!includeQuestions,
    );

    return context.json(proceedRecommendation);
  }
}

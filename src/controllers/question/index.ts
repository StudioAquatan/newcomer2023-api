import { Context } from 'hono';
import { z } from 'zod';
import { HonoEnv } from '../..';
import { Question } from '../../models/question';
import { QuestionRepository } from '../../repositories/question/repository';
import { operations, components } from '../../schema';

export class QuestionController {
  constructor(private questionRepo: QuestionRepository) {}

  private toResponse(
    question: Question,
  ): z.TypeOf<typeof components.schemas.Question.serializer> {
    return {
      id: question.id,
      questionText: question.questionText,
      questionType: question.questionType,
      answers: question.answers.map((text, id) => ({ id, text })),
      sort: question.sort,
    };
  }

  async getQuestionList(ctx: Context<HonoEnv>): Promise<Response> {
    const list = await this.questionRepo.getAllSorted();

    const responseType =
      operations['get-questions'].responses[200].content['application/json'];
    return ctx.json(responseType.parse(list.map(this.toResponse)));
  }
}

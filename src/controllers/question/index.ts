import { z } from 'zod';
import { Question } from '../../models/question';
import { QuestionRepository } from '../../repositories/question/repository';
import { operations, components } from '../../schema';

const questionList =
  operations['get-questions'].responses[200].content['application/json'];

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
    };
  }

  async getQuestionList(): Promise<z.TypeOf<typeof questionList>> {
    const list = await this.questionRepo.getAllSorted();
    return list.map(this.toResponse);
  }
}

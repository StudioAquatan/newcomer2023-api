import { Question } from '../../models/question';

export interface QuestionRepository {
  getAllSorted(): Promise<Question[]>;
}

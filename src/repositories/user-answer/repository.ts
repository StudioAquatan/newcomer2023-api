import { UserAnswer, UncommitedUserAnswer } from '../../models/user-answer';

export interface UserAnswerRepository {
  insertUserAnswer(userAnwer: UncommitedUserAnswer): Promise<UserAnswer>;
  getUserAnswer(userId: string): Promise<UserAnswer>;
  updateUserAnswer(userAnswer: UncommitedUserAnswer): Promise<UserAnswer>;
}

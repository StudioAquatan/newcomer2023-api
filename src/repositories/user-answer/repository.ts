import {
  UserAnswer,
  InitialUserAnswer,
  UncommitedUserAnswer,
} from '../../models/user-answer';

export interface UserAnswerRepository {
  insertUserAnswer(userAnwer: InitialUserAnswer): Promise<UserAnswer>;
  getUserAnswer(userId: string): Promise<UserAnswer>;
  updateUserAnswer(userAnswer: UncommitedUserAnswer): Promise<UserAnswer>;
}

import { UserAnswer, UncommitedUserAnswer } from '../../models/user-answer';

export interface UserAnswerRepository {
  insertUserAnswer(uncommited: UncommitedUserAnswer): Promise<UserAnswer>;
  fetchUserAnswer(userId: string): Promise<UserAnswer>;
  updateUserAnswer(uncommited: UncommitedUserAnswer): Promise<UserAnswer>;
}

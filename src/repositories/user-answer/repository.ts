import {
  UserAnswer,
  InitialUserAnswer,
  UncommitedUserAnswer,
} from '../../models/user-answer';

export interface UserAnswerRepository {
  insertUserAnswer(initial: InitialUserAnswer): Promise<UserAnswer>;
  getUserAnswer(userId: string): Promise<UserAnswer>;
  updateUserAnswer(uncommited: UncommitedUserAnswer): Promise<UserAnswer>;
}

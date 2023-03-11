import { v4 as uuid } from 'uuid';
import { QuestionResult, UncommitedUserAnswer } from '../../models/user-answer';
import { UserAnswerRepositoryImpl } from './impl';

const { __D1_BETA__DB } = getMiniflareBindings();

const numQuestion = 8; // 質問数

describe('User Answer Respository', () => {
  const impl = new UserAnswerRepositoryImpl(__D1_BETA__DB);

  const userId1 = uuid();
  const userId2 = uuid();

  // ユーザの回答結果の生成
  const answers: QuestionResult[] = [];
  for (let i = 0; i < numQuestion; i++) {
    const answer = new QuestionResult(i.toString(), (i % 5) + 1);
    answers.push(answer);
  }

  const testAnswer = new UncommitedUserAnswer(userId1, answers);

  beforeEach(async () => {
    await impl.migrate(); // テーブルの生成
    await impl.insertUserAnswer(testAnswer); // 回答結果を1つ挿入
  });

  afterEach(async () => {
    await __D1_BETA__DB.exec('DELETE FROM user_answer');
  });

  test('Insert user answer', async () => {
    const addtional = new UncommitedUserAnswer(userId2, answers);
    const inserted = await impl.insertUserAnswer(addtional);
    expect(inserted.userId).toBe(userId2);

    const insertedAnswers = inserted.answers;
    for (let i = 0; i < insertedAnswers.length; i++) {
      expect(insertedAnswers[i].questionId).toBe(answers[i].questionId);
      expect(insertedAnswers[i].answer).toBe(answers[i].answer);
    }
  });

  test('Fetch user answer', async () => {
    const stored = await impl.fetchUserAnswer(userId1);
    expect(stored.userId).toBe(userId1);

    const storedAnswers = stored.answers;
    for (let i = 0; i < storedAnswers.length; i++) {
      expect(storedAnswers[i].questionId).toBe(answers[i].questionId);
      expect(storedAnswers[i].answer).toBe(answers[i].answer);
    }
  });

  test('Update user answer', async () => {
    answers.reverse(); // 回答結果を反転
    const uncommited = testAnswer.updateAnswer(answers);
    const updated = await impl.updateUserAnswer(uncommited);

    expect(updated.userId).toBe(userId1);

    const updatedAnswers = updated.answers;
    for (let i = 0; i < updatedAnswers.length; i++) {
      expect(updatedAnswers[i].questionId).toBe(answers[i].questionId);
      expect(updatedAnswers[i].answer).toBe(answers[i].answer);
    }
  });
});

export {};

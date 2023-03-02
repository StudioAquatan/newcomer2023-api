import { v4 as uuid } from 'uuid';
import { QuestionResult, InitialUserAnswer } from '../../models/user-answer';
import { UserAnswerRepositoryImpl } from './impl';

const { __D1_BETA__DB } = getMiniflareBindings();

const numQuestion = 8; // 質問数

describe('UserAnswerRespositoryImpl', () => {
  const impl = new UserAnswerRepositoryImpl(__D1_BETA__DB);

  const userId1 = uuid();
  const userId2 = uuid();

  // ユーザの回答結果の生成
  const answers: QuestionResult[] = [];
  for (let i = 0; i < numQuestion; i++) {
    const answer = new QuestionResult(i.toString(), (i % 5) + 1);
    answers.push(answer);
  }

  const userAnswer = new InitialUserAnswer(userId1, answers);

  beforeEach(async () => {
    await impl.migrate(); // テーブルの生成
    await impl.insertUserAnswer(userAnswer); // 回答結果を1つ挿入
  });

  afterEach(async () => {
    await __D1_BETA__DB.exec('DELETE FROM user_answer');
  });

  test('Insert user answer', async () => {
    const initial = new InitialUserAnswer(userId2, answers);
    const inserted = await impl.insertUserAnswer(initial);
    expect(inserted.id).toBe(userId2);

    const insertedAnswers = inserted.answers;
    for (let i = 0; i < insertedAnswers.length; i++) {
      expect(insertedAnswers[i].questionId).toBe(answers[i].questionId);
      expect(insertedAnswers[i].answer).toBe(answers[i].answer);
    }

    expect(inserted.numAnswered).toBe(1);
  });

  test('Get user answer', async () => {
    const stored = await impl.getUserAnswer(userId1);
    expect(stored.id).toBe(userId1);

    const storedAnswers = stored.answers;
    for (let i = 0; i < storedAnswers.length; i++) {
      expect(storedAnswers[i].questionId).toBe(answers[i].questionId);
      expect(storedAnswers[i].answer).toBe(answers[i].answer);
    }

    expect(stored.numAnswered).toBe(1);
  });

  test('Update user answer', async () => {
    answers.reverse(); // 回答結果を反転
    const uncommited = userAnswer.updateAnswer(answers);
    const updated = await impl.updateUserAnswer(uncommited);

    expect(updated.id).toBe(userId1);

    const updatedAnswers = updated.answers;
    for (let i = 0; i < updatedAnswers.length; i++) {
      expect(updatedAnswers[i].questionId).toBe(answers[i].questionId);
      expect(updatedAnswers[i].answer).toBe(answers[i].answer);
    }

    expect(updated.numAnswered).toBe(2);
  });
});

export {};

// 診断質問問答
export class QuestionResult {
  constructor(
    public readonly questionId: string,
    public readonly answer: number,
  ) {}
}

// DB上のユーザの回答表現
export class UserAnswer {
  constructor(
    public readonly id: string,
    public readonly answers: QuestionResult[],
    public readonly numAnswered: number, // 回答を変更した回数
  ) {}

  updateAnswer(newAnswer: QuestionResult[]): UncommitedUserAnswer {
    // 回数制限を課すならココ
    return new UncommitedUserAnswer(this.id, newAnswer, this.numAnswered + 1);
  }
}

const initialMarker = Symbol();

export class InitialUserAnswer extends UserAnswer {
  [initialMarker] = null;

  constructor(userId: string, answers: QuestionResult[]) {
    super(userId, answers, 1);
  }
}

// 呼び出すごとに異なるオブジェクトを返す
const uncommitMarker = Symbol();

export class UncommitedUserAnswer extends UserAnswer {
  [uncommitMarker] = null;

  constructor(userId: string, answers: QuestionResult[], numAnswered: number) {
    super(userId, answers, numAnswered);
  }
}

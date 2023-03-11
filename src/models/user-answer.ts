// 診断質問問答
export class QuestionResult {
  constructor(
    public readonly questionId: string,
    public readonly answer: number,
  ) {}
}

// ユーザの回答結果のDB上の表現
export class UserAnswer {
  constructor(
    public readonly userId: string,
    public readonly answers: QuestionResult[],
  ) {}

  updateAnswer(newAnswer: QuestionResult[]): UncommitedUserAnswer {
    return new UncommitedUserAnswer(this.userId, newAnswer);
  }
}

// 呼び出すごとに異なるオブジェクトを返す
const uncommitMarker = Symbol();

export class UncommitedUserAnswer extends UserAnswer {
  [uncommitMarker] = null;

  constructor(userId: string, answers: QuestionResult[]) {
    super(userId, answers);
  }
}

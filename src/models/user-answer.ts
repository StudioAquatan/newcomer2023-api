const updateLimit = 5; // 回答し直せる上限回数

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
    if (this.numAnswered < updateLimit) {
      // TODO: 何を返すべきか分からなかった
    }
    return new UncommitedUserAnswer(this.id, newAnswer, this.numAnswered + 1);
  }
}

export class InitialUserAnswer extends UserAnswer {
  constructor(userId: string, answers: QuestionResult[]) {
    super(userId, answers, 1);
  }

  insertAnswer() {
    return new UncommitedUserAnswer(this.id, this.answers, this.numAnswered);
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

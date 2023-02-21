export class Question {
  constructor(
    public readonly id: string,
    public readonly questionText: string,
    public readonly questionType: 'yesno' | 'five' | 'choice',
    public readonly answers: string[] = [],
    public readonly formIndex: number,
    public readonly sort: number,
  ) {}
}

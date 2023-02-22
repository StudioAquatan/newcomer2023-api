import { Question } from '../../models/question';
import { NewtContentsResponse } from '../../types/newt';
import { QuestionRepository } from './repository';

interface Content {
  id: string;
  questionText: string;
  questionType: string;
  answers: string;
  formIndex?: number;
  sort: number;
}
export class QuestionRepositoryImpl implements QuestionRepository {
  constructor(
    private spaceUid: string,
    private appUid: string,
    private apiKey: string,
  ) {}

  private async fetchFromCDN(): Promise<NewtContentsResponse<Content>> {
    const url = `https://${this.spaceUid}.cdn.newt.so/v1/${this.appUid}/question?limit=100&depth=2`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    return await response.json<NewtContentsResponse<Content>>();
  }

  async getAllSorted(): Promise<Question[]> {
    const response = await this.fetchFromCDN();

    const isValidType = (type: string): type is Question['questionType'] =>
      ['yesno', 'five', 'choice'].includes(type);
    const validateType = (type: string): Question['questionType'] => {
      if (isValidType(type)) {
        return type;
      } else {
        throw new Error('Invalid type');
      }
    };

    const converted = response.items.map(
      (content) =>
        new Question(
          content.id,
          content.questionText,
          validateType(content.questionType),
          content.answers.split(/\n/).filter((text) => text !== ''),
          content.formIndex ?? 0,
          content.sort,
        ),
    );

    return converted.sort((a, b) => a.sort - b.sort);
  }
}

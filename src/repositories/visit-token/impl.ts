import { NewVisitToken, VisitToken } from '../../models/visit-token';
import { VisitTokenRepository, NoVisitTokenError } from './repository';

// 今のところtoken -> orgのlookupしかしないのでKVに入れる
export class VisitTokenRepositoryImpl implements VisitTokenRepository {
  constructor(private kv: KVNamespace) {}

  private kvKey(token: string) {
    return `t:${token}`;
  }

  async storeToken(newToken: NewVisitToken): Promise<VisitToken> {
    await this.kv.put(this.kvKey(newToken.token), newToken.orgId);
    return new VisitToken(newToken.orgId, newToken.token);
  }

  async findByToken(token: string): Promise<VisitToken> {
    const result = await this.kv.get(this.kvKey(token));

    if (result === null) {
      throw new NoVisitTokenError();
    }

    return new VisitToken(result, token);
  }
}

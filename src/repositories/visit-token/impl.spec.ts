import { NewVisitToken } from '../../models/visit-token';
import { VisitTokenRepositoryImpl } from './impl';

const { KV } = getMiniflareBindings();

describe('VisitTokenRepository', () => {
  const impl = new VisitTokenRepositoryImpl(KV);

  beforeAll(async () => {
    await KV.put('t:testtoken', 'testorg');
  });

  afterAll(async () => {
    await KV.delete('t:testtoken');
  });

  it('storeToken', async () => {
    const newToken = new NewVisitToken('testorg');
    const token = await impl.storeToken(newToken);
    expect(token.token).toHaveLength(36);

    const dbContent = await KV.get(`t:${token.token}`);
    expect(dbContent).toBeTruthy();
  });

  it('findByToken', async () => {
    const token = await impl.findByToken('testtoken');
    expect(token.orgId).toBe('testorg');
  });
});

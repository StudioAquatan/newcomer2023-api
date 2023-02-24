import { NewVisitToken } from '../../models/visit-token';
import { VisitTokenRepositoryImpl } from './impl';

const { __D1_BETA__DB } = getMiniflareBindings();

describe('VisitTokenRepository', () => {
  const impl = new VisitTokenRepositoryImpl(__D1_BETA__DB);

  beforeEach(async () => {
    await impl.migrate();
    await __D1_BETA__DB
      .prepare('INSERT INTO visit_token(orgId, token) VALUES (?, ?)')
      .bind('testorg', 'testtoken')
      .run();
  });

  afterEach(async () => {
    await __D1_BETA__DB.exec('DELETE FROM visit_token');
  });

  it('storeToken', async () => {
    const newToken = new NewVisitToken('testorg2');
    const token = await impl.storeToken(newToken);
    expect(token.token).toHaveLength(36);
  });

  it('storeToken (dup)', async () => {
    await expect(async () => {
      const newToken = new NewVisitToken('testorg');
      await impl.storeToken(newToken);
    }).rejects.toThrow();
  });

  it('findByToken', async () => {
    const token = await impl.findByToken('testtoken');
    expect(token.orgId).toBe('testorg');
  });
});

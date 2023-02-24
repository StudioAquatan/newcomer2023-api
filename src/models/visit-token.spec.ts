import { NewVisitToken, VisitToken } from './visit-token';

describe('VisitToken', () => {
  it('NewVisitToken UUID', () => {
    const newToken = new NewVisitToken('testorg');
    expect(newToken.orgId).toBe('testorg');
    expect(newToken.token).toHaveLength(36);
  });

  it('VisitToken', () => {
    const token = new VisitToken('testorg', 'testtoken');
    expect(token.orgId).toBe('testorg');
    expect(token.token).toBe('testtoken');
  });

  it('VisitToken validate', () => {
    const token = new VisitToken('testorg', 'testtoken');
    expect(token.orgId).toBe('testorg');
    expect(token.token).toBe('testtoken');

    expect(token.validate('invalid')).toBe(false);
    expect(token.validate('testtoken')).toBe(true);
  });

  it('VisitToken createVisit', () => {
    const token = new VisitToken('testorg', 'testtoken');
    const visit = token.createVisit('testuser');

    expect(visit.orgId).toBe('testorg');
    expect(visit.userId).toBe('testuser');
    expect(visit.visitedAt.diffNow().as('second')).toBeLessThanOrEqual(1);
  });
});

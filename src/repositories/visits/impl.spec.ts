import { DateTime } from 'luxon';
import { Visit } from '../../models/visit';
import { VisitRepositoryImpl } from './impl';

const { __D1_BETA__DB } = getMiniflareBindings();

describe('VisitRepositoryImpl', () => {
  const impl = new VisitRepositoryImpl(__D1_BETA__DB);
  const testVisit = new Visit(
    'f1e05f6a-0564-4356-83a6-610298c64ab5',
    'testorg',
    DateTime.fromSQL('2017-05-15 09:12:34', { zone: 'UTC' }),
  );

  beforeEach(async () => {
    await impl.migrate();
    await __D1_BETA__DB
      .prepare('INSERT INTO visits VALUES (?, ?, ?)')
      .bind(
        'f1e05f6a-0564-4356-83a6-610298c64ab5',
        'testorg',
        '2017-05-15 09:12:34',
      )
      .run();
    await __D1_BETA__DB
      .prepare('INSERT INTO visits VALUES (?, ?, ?)')
      .bind(
        'f1e05f6a-0564-4356-7877-610298c64ab5',
        'testorg2',
        '2018-05-15 09:12:34',
      )
      .run();
  });

  afterEach(async () => {
    await __D1_BETA__DB.exec('DELETE FROM visits');
  });

  test('createVisit', async () => {
    const visit = await impl.createVisit(
      'f3ca5321-efb2-48b2-b090-c0214b694ad2',
      'testorg',
    );
    expect(visit.userId).toBe('f3ca5321-efb2-48b2-b090-c0214b694ad2');
    expect(visit.orgId).toBe('testorg');
    expect(visit.visitedAt.diffNow().as('second')).toBeLessThanOrEqual(1);

    const visits = await impl.getAllVisit(
      'f3ca5321-efb2-48b2-b090-c0214b694ad2',
    );
    expect(visits.length).toBe(1);
    expect(visits[0]).toStrictEqual(visit);
  });

  test('getAllVisit', async () => {
    const visits = await impl.getAllVisit(
      'f1e05f6a-0564-4356-83a6-610298c64ab5',
    );

    expect(visits.length).toBe(1);
    expect(visits[0].userId).toBe(testVisit.userId);
    expect(visits[0].orgId).toBe(testVisit.orgId);
    expect(visits[0].visitedAt).toStrictEqual(testVisit.visitedAt);
  });
});

export {};

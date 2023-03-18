import { Exclusion, UncommitedExclusion } from '../../models/exclusion';
import { ExclusionRepositoryImpl } from './impl';
import { AlreadyExcludedError } from './repository';

const { __D1_BETA__DB } = getMiniflareBindings();

describe('ExclusionRepositoryImpl', () => {
  const impl = new ExclusionRepositoryImpl(__D1_BETA__DB);
  const testData = new Exclusion(
    'f1e05f6a-0564-4356-83a6-610298c64ab5',
    'testorg',
  );

  beforeEach(async () => {
    await impl.migrate();
    await __D1_BETA__DB
      .prepare(`INSERT INTO exclusion(userId, orgId) VALUES (?, ?)`)
      .bind(testData.userId, testData.orgId)
      .run();
  });

  afterEach(async () => {
    await __D1_BETA__DB.exec('DELETE FROM exclusion');
  });

  test('create', async () => {
    const newExclusion = new UncommitedExclusion(
      'f3ca5321-efb2-48b2-b090-c0214b694ad2',
      'testorg',
    );
    const exclusion = await impl.create(newExclusion);
    expect(exclusion.userId).toBe('f3ca5321-efb2-48b2-b090-c0214b694ad2');
    expect(exclusion.orgId).toBe('testorg');

    const exlusions = await impl.getByUser(
      'f3ca5321-efb2-48b2-b090-c0214b694ad2',
    );
    expect(exlusions.length).toBe(1);
    expect(exlusions[0]).toStrictEqual(exclusion);
  });

  test('create(dup)', async () => {
    try {
      const exclusion = new UncommitedExclusion(
        testData.userId,
        testData.orgId,
      );
      await impl.create(exclusion);
    } catch (e) {
      expect(e).toBeInstanceOf(AlreadyExcludedError);
    }
  });

  test('delete', async () => {
    await impl.delete(testData);
    const exclusions = await impl.getByUser(
      'f1e05f6a-0564-4356-83a6-610298c64ab5',
    );

    expect(exclusions.length).toBe(0);
  });

  test('getAll', async () => {
    const exclusions = await impl.getByUser(
      'f1e05f6a-0564-4356-83a6-610298c64ab5',
    );

    expect(exclusions.length).toBe(1);
    expect(exclusions[0].userId).toBe(testData.userId);
    expect(exclusions[0].orgId).toBe(testData.orgId);
  });
});

export {};

interface Bindings {
  __D1_BETA__DB: D1Database;
}

declare global {
  function getMiniflareBindings(): Bindings;
}

const { __D1_BETA__DB } = getMiniflareBindings();

test('check', async () => {
  console.log(
    'OK',
    await __D1_BETA__DB.exec(
      'CREATE TABLE test(id INTEGER PRIMARY KEY AUTOINCREMENT)',
    ),
  );
});

export {};

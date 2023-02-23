interface Bindings {
  __D1_BETA__DB: D1Database;
  KV: KVNamespace;
}

declare global {
  function getMiniflareBindings(): Bindings;
}

export {};

interface Bindings {
  __D1_BETA__DB: D1Database;
}

declare global {
  function getMiniflareBindings(): Bindings;
}

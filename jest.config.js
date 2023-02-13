module.exports = {
  testEnvironment: 'miniflare', // ✨
  // Tell Jest to look for tests in .mjs files too
  testMatch: [
    '**/__tests__/**/*.?(m)[jt]s?(x)',
    '**/?(*.)+(spec|test).?(m)[jt]s?(x)',
  ],
  transform: {
    '^.+\\.tsx?$': 'esbuild-jest',
  },
  moduleFileExtensions: ['js', 'ts', 'tsx', 'mts', 'mtsx'],
};

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/env.js'],
  globalSetup: '<rootDir>/test/global-setup.js',
  testTimeout: 60000,
  moduleNameMapper: {
    '^@last-lesson/(.*)$': '<rootDir>/../../packages/$1/src',
  },
  transform: { '^.+\\.ts$': ['ts-jest', { isolatedModules: true, tsconfig: { target: 'ES2022', module: 'commonjs', experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true } }] },
};

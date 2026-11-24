module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@last-lesson/constants$': '<rootDir>/../../packages/constants/src',
    '^@last-lesson/shared-types$': '<rootDir>/../../packages/shared-types/src',
    '^@last-lesson/validation$': '<rootDir>/../../packages/validation/src',
  },
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: { experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true } }] },
};

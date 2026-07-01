/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Resolve path aliases (@/* -> src/*)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // ts-jest options — use a separate tsconfig so Jest stays in CommonJS
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        isolatedModules: true, // Skip full type checking for fast test execution
      },
    ],
  },

  // Only scan __tests__ directories and *.test.ts files
  testMatch: ['**/__tests__/**/*.test.ts'],

  // Collect coverage from source files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.*.ts',
  ],

  // Clear mocks between tests automatically
  clearMocks: true,
  restoreMocks: true,
};

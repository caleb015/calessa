import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// Pin tests to the wedding's timezone so date/time assertions don't depend on the machine.
process.env.TZ = 'Asia/Manila';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default createJestConfig(config);

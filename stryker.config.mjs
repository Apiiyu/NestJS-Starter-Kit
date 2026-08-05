/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  concurrency: '50%',
  coverageAnalysis: 'perTest',
  dryRunTimeoutMinutes: 10,
  ignoreStatic: true,
  jest: {
    enableFindRelatedTests: true,
    projectType: 'custom',
  },
  mutate: [
    'src/common/**/*.ts',
    'src/modules/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.decorator.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
  ],
  reporters: ['clear-text', 'progress', 'html', 'json'],
  testRunner: 'jest',
  thresholds: {
    break: 60,
    high: 80,
    low: 60,
  },
  timeoutMS: 10000,
};

export default config;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular-dependencies',
      comment: 'Cycles make Nest module initialization order and ownership ambiguous.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'controllers-do-not-access-persistence',
      comment:
        'Controllers terminate the HTTP boundary and must delegate persistence work to services.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/controllers/' },
      to: {
        path: [
          '^src/database/',
          '^src/modules/[^/]+/repositories/',
          '^node_modules/typeorm/',
          '^(?:node:)?typeorm$',
        ],
      },
    },
    {
      name: 'modules-use-public-boundaries',
      comment:
        'A feature may depend on another feature only through its public index; internals remain owned by that feature.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/(?!$1(?:/|$))[^/]+/(?!index[.]ts$)' },
    },
    {
      name: 'no-unresolvable-dependencies',
      comment: 'Every source import must resolve in a clean checkout.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '[.]spec[.]ts$' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      exportsFields: ['exports'],
      extensions: ['.ts', '.js', '.json'],
    },
  },
};

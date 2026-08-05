## What changed

<!-- One or two sentences. The "why" matters more than the "what". -->

## Why

<!-- What problem does this solve? Link the issue if there is one. -->

## How it was verified

<!-- Name the actual command or request you ran, and what came back.
     "Tests pass" is not verification; "curl -i /api/v1/users returned 200 with
     the paginated envelope" is. -->

## Checklist

- [ ] `bun run lint:check` passes
- [ ] `bunx tsc --noEmit` passes
- [ ] `bunx tsc --noEmit -p tsconfig.tools.json` passes
- [ ] `bun run architecture:check` passes
- [ ] `bun run test:cov && bun run coverage:ratchet -- --check` passes
- [ ] `bun run test:e2e` passes when runtime behavior changed
- [ ] `bun run build` passes
- [ ] `bun run audit:ci` and SBOM validation pass when dependencies changed
- [ ] `bun run sdk:build` passes when the HTTP contract changed
- [ ] Schema changes ship as a migration, and `migration:revert` was tested
- [ ] Any new dependency is justified above
- [ ] Docs updated if behaviour or conventions changed

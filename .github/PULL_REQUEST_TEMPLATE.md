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
- [ ] `bun run test:cov` passes
- [ ] `bun run build` passes
- [ ] Schema changes ship as a migration, and `migration:revert` was tested
- [ ] Any new dependency is justified above
- [ ] Docs updated if behaviour or conventions changed

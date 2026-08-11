# Agent Rules — One Page

> Read this **before** touching code. If only one document gets read, this is the one.
> These rules outrank `README.md`, `CLAUDE.md`, `AGENTS.md`, and any plan or task file when
> they conflict.

---

## Rule 0 — Evidence, not belief

**No task is marked `[x]` without the command output pasted underneath it.**

Not "I tested it". Not "it should work". Not "the implementation matches the spec". The raw
output:

```
- [x] Add pagination to GET /api/v1/users
      $ bun run test src/modules/users
      Test Suites: 3 passed, 3 total
      Tests:       18 passed, 18 total
```

If there is no output you can paste, the task is **not done**. Full stop.

This is the most load-bearing rule in the repository. Every other rule below exists because
some specific claim was made without evidence and turned out to be false.

---

## Rule 1 — Verify against the real system, not against the code

Reading code is **never** enough to claim something about a system you do not control — a
database, a message broker, a third-party API, a cache. The worst bugs are invisible from the
source, because the source encodes what the author _assumed_ the other side does.

One observation is not a contract. A contract needs a contrasting case: the call that should
succeed **and** the call that should fail. If you have only seen the success, you have not
established anything about the failure — you have guessed.

| Target             | Verification command                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| PostgreSQL         | `psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT ..."` |
| Table schema       | `information_schema.columns` — never guess a column type                     |
| Redis              | `redis-cli -h $REDIS_HOST -p $REDIS_PORT` — read commands only               |
| HTTP endpoint      | `curl -i` showing status line and body                                       |
| Queue behaviour    | Enqueue a job and read the processor log, not the processor source           |
| Generated contract | `bun run sdk:build`, then read `artifacts/openapi.json`                      |

**Stay read-only against anything you did not create.** No `INSERT`, `UPDATE`, `DELETE`, or
write-side API call against a system whose state someone else depends on.

---

## Rule 2 — A stub screams, it does not lie

Returning a fake value that passes for success is forbidden.

```typescript
// FORBIDDEN — lies to the caller, and the caller has no way to know.
return { success: true, reference: `REF-${Date.now()}` };

// FORBIDDEN — indistinguishable from "there genuinely is no data".
return null;
return [];

// CORRECT
throw new NotImplementedException('MailService.sendInvoice is not implemented yet.');
```

If you have not implemented it, **throw**. A system that fails loudly is far cheaper than one
that is quietly wrong.

---

## Rule 3 — Tests must not lock in emptiness

```typescript
// FORBIDDEN — this makes "empty" the specification. The correct implementation,
// when it finally lands, will fail this test.
it('findById returns null for the not-implemented stub', ...);
```

A test whose name contains **stub**, **placeholder**, or **not implemented** is a red flag and
must be rejected at review.

**Suite duration is a signal.** If the whole suite finishes in a couple of seconds, then zero
tests touched Postgres, Redis, or the network — and no integration claim in the changeset has
been proven. Anything that crosses a process boundary needs at least one test that actually
crosses it. This repository has `bun run test:e2e` on real testcontainers for exactly that.

---

## Rule 4 — Fixtures are recorded, not invented

Every fixture states where it came from:

```typescript
/**
 * @description Recorded from GET /api/v1/users?limit=2 against a local stack seeded by
 * `bun run seed:run`, 2026-08-11. Identifiers regenerated; no real personal data.
 * Command: curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/users?limit=2"
 */
```

A contract test that compares a hand-written DTO against a hand-written fixture **proves
nothing** — it confirms the author's imagination agrees with itself.

---

## Rule 5 — Access boundaries live inside the query

Any scope that decides which rows a caller may see is derived from server-side identity and
becomes **part of the query**, never a check applied after the rows are already loaded.

```typescript
// FORBIDDEN — the row is already in memory; one branch that forgets the check leaks it.
const row = await repository.findOne({ where: { id } });
if (!isAllowed(user, row)) throw new ForbiddenException();

// CORRECT — a row outside the scope is never loaded at all.
const row = await this._scoped(query, user).andWhere('users.id = :id', { id }).getOne();
```

A row outside the scope must look **identical to a row that does not exist** (404, not 403),
so the endpoint cannot be used to enumerate what exists.

Every role × endpoint combination needs a positive **and** a negative test. Authorization
failures are silent by nature — nothing crashes when too much is returned.

---

## Rule 6 — Never weaken a gate

Strictly forbidden: lowering `coverage-baseline.json`, relaxing `eslint.config.mjs`, narrowing
`.dependency-cruiser.cjs`, removing globs from `RATCHETED_PATHS` in
`scripts/check-conventions.ts`, using `--no-verify`, or deleting a test that is in the way.

If coverage drops, **add tests**. If the architecture check fails, **fix the dependency**. If
the convention check fails, **fix the code** — never the checker.

The ratchet only turns one way. `RATCHETED_PATHS` covers all of `src` in this starter kit; a
project grown from it may narrow the list only at the moment of forking, and from then on the
list may only grow.

---

## Rule 7 — When a document contradicts reality, reality wins

Documentation drifts. Code that runs does not.

If you find a contradiction between a document and what the system actually does:

1. **Stop.** Do not implement either version.
2. Collect evidence — the command and its output.
3. Write it down, then ask.
4. Continue only once the document is corrected.

Following a document you have proven wrong is not compliance. It still produces a wrong system.

---

## Checklist before saying "done"

- [ ] Every task has pasted command output
- [ ] `bun run lint:check` passes — includes import grouping and code conventions
- [ ] `bunx tsc --noEmit` and `bunx tsc --noEmit -p tsconfig.tools.json` — both zero errors
- [ ] `bun run architecture:check` passes
- [ ] `bun run test` passes, with the count stated
- [ ] `bun run coverage:ratchet -- --check` passes **without** lowering the baseline
- [ ] `bun run audit:ci` passes
- [ ] New endpoints appear in `bun run sdk:build` output and pass `openapi:lint`
- [ ] No stub returns a fake value
- [ ] No secret in code, fixtures, logs, or documents

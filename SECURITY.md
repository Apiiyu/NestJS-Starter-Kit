# Security Policy

## Supported versions

This is a starter kit; only the latest `main` receives fixes. If you generated a
project from an older commit, rebase onto current `main` to pick up security work.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private vulnerability reporting
("Security" tab -> "Report a vulnerability") so the report stays confidential until
a fix exists.

Please include the affected version or commit, reproduction steps, and the impact
you believe it has. You can expect an acknowledgement within 7 days.

## Notes for projects built on this kit

The kit ships secure defaults, but three things are yours to get right:

- `JWT_SECRET` must be a high-entropy value set per environment. It is deliberately
  blank in `.env.example` so an unset secret fails loudly rather than defaulting.
- `DATABASE_SYNCHRONIZE` must stay `false` outside local development. It will drop
  columns to match entities.
- `DATABASE_MIGRATIONS_RUN` should be `false` in production. Run migrations as a
  deploy step; several replicas booting together will otherwise race for the lock.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev       # Start with watch mode (also runs lint check)
npm run start:debug     # Debug mode with watch

# Build & Production
npm run build           # Compile TypeScript
npm run start:prod      # Run compiled output

# Testing
npm test                # Unit tests
npm run test:watch      # Unit tests in watch mode
npm run test:cov        # Coverage report
npm run test:e2e        # E2E tests (./test/jest-e2e.json config)

# Code Quality
npm run lint:fix        # ESLint with auto-fix
npm run format          # Prettier on src/ and test/

# Database
npm run seed:run        # Run database seeders (TypeORM-extension)

# Scaffolding
npm run generate:module <name>   # Generate full DDD module skeleton
```

## Architecture

**Domain-Driven Design** with layered configuration and feature modules.

### Module Hierarchy

```
AppModule
├── Config layer: AppConfigurationModule, DatabasePostgresConfigModule, JwtConfigurationModule
├── DB layer: PostgresDatabaseProviderModule (TypeORM DataSource)
└── Feature layer:
    ├── AuthenticationModule  ← imports UsersModule
    └── UsersModule
```

### Configuration Pattern

Each configuration lives in `src/configurations/<domain>/`. Config modules use `registerAs()` for namespaced env binding and inject via `registerAsync()`. Three config namespaces: `app`, `database.postgres`, `jwt`.

Environment variables are loaded via `.env` (see `.env.example`). Required vars: `APP_*`, `DATABASE_*`, `JWT_*`.

### Database Pattern

- **TypeORM + PostgreSQL**, Data Mapper pattern
- `AppBaseEntity` (`src/common/entities/app-base-entity.ts`): UUID PK, Unix-ms timestamps, createdBy/updatedBy/deletedBy audit fields, soft delete via `deletedAt`
- DataSource config at `src/database/postgres/postgres-data-source.ts`
- Seeders in `src/database/seeders/`

### Authentication Pattern

- **Local strategy**: bcrypt password validation → issues JWT
- **JWT strategy**: Bearer token from Authorization header, validates issuer
- Guards: `JwtAuthGuard`, `LocalAuthGuard` in `src/common/guards/`
- Password hashing uses `SALT_OR_ROUND` constant from bcrypt helpers

### API Response Pattern

All responses are wrapped via `CustomBaseResponseInterceptor` → `BaseResponseDto<T>` with `statusCode`, `message`, `data`. Global validation uses `ValidationPipe` with `transform: true` and `whitelist: true`. Use `@Exclude()` on entity fields for serialization control.

### Generating a New Module

```bash
npm run generate:module products
```

Creates: Controller, Service, Entity, DTOs, Interfaces — following the established `src/modules/<name>/` structure. Always use this generator to maintain consistency.

### Code Style Conventions

- Private class properties use underscore prefix: `_propertyName`
- Keep variable/function/import names alphabetically ordered within their block
- Before adding a dependency, evaluate: update frequency, community size, open issues, bundle impact

# Architecture Decision Records

Architecture Decision Records (ADRs) capture choices that constrain future changes.
They explain the context and trade-offs; source code and migrations remain the executable
truth.

## Index

| ADR                                                   | Decision                              | Status   |
| ----------------------------------------------------- | ------------------------------------- | -------- |
| [0001](0001-use-typeorm-with-postgresql.md)           | Use TypeORM with PostgreSQL           | Accepted |
| [0002](0002-use-bun-as-the-package-toolchain.md)      | Use bun as the package toolchain      | Accepted |
| [0003](0003-pin-node-24-and-typescript-6.md)          | Pin Node 24 and TypeScript 6          | Accepted |
| [0004](0004-keep-audit-column-names-camel-case.md)    | Keep audit column names camelCase     | Accepted |
| [0005](0005-use-native-timestamps-and-soft-delete.md) | Use native timestamps and soft delete | Accepted |

Copy [the template](template.md) for a new decision. Number ADRs sequentially; accepted
records are immutable except for typo fixes. Supersede a decision with a new ADR and link
both records.

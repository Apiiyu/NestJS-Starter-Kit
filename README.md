# 🌟 NestJS Starter Kit

[![CI](https://github.com/Apiiyu/NestJS-Starter-Kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Apiiyu/NestJS-Starter-Kit/actions/workflows/ci.yml)
[![Security](https://github.com/Apiiyu/NestJS-Starter-Kit/actions/workflows/security.yml/badge.svg)](https://github.com/Apiiyu/NestJS-Starter-Kit/actions/workflows/security.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Apiiyu/NestJS-Starter-Kit/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Apiiyu/NestJS-Starter-Kit)

This project built with NestJS, TypeScript, and much more.

## Starter Introduction

This application use DDD pattern. Here you can learn a little about DDD pattern, [Visit me](https://www.geeksforgeeks.org/domain-driven-design-ddd)

---

## 🏆 Tips

Here's my opinions for write our code more clean and readable. So, you can follow it or ignore it.

1. Always using \_ (underscore) on your private property or method. In typescript, we also can use # (hashtag) to define private property or method Example:

```bash
private readonly _usersService: UsersService;
private _generateToken() {};

// or
#usersService: UsersService;
#generateToken() {};
```

Reason: Some languages like Python also use underscores to denote private or protected members. This convention can make it easier for developers familiar with multiple languages to recognize private members consistently.

Side Effect: -

2. Order naming your variables, function, etc to ascending.

```bash
export const useAuthenticationHook = () => {
  /**
   * @description Reactive data binding
   */
  const [authentication_accessToken, setAuthentication_accessToken] = useState();
  const [authentication_form, setAuthentication_form] = useState();

  const authentication_onCancel = () => {
     // Do something here
  }

  const authentication_onSubmit = () => {
     // Do something here
  }

  return {
    authentication_accessToken,
    authentication_form,
    authentication_onSubmit
  }
```

Reason: One of the most important reasons for creating variables, functions, and so on in ascending sequence is to make things easier while troubleshooting or adding features.

Side Effect: -

3. Create new domain/feature using custom command

```bash
Example: Let's say we want to create a new feature called "products." Instead of manually creating each component, we can leverage a powerful and user-friendly command.

Simply run the following command:
npm run generate:module name-of-feature

For example:
npm run generate:module products

```

What Does This Do?
This command automatically generates the necessary structure for your new feature, including:

- Controllers: Manages incoming requests and returns responses.
- DTOs (Data Transfer Objects): Defines the structure of data for requests and responses.
- Entities: Represents the data models and how they map to the database.
- Interfaces: Defines TypeScript interfaces for strong typing and consistency.
- Services: Contains the core business logic for your feature.

> With this command, you no longer need to manually use the Nest CLI for these tasks—saving you time and ensuring consistency across your project.

Why Use This Command?

- Efficiency: Automates the creation of boilerplate code and standard structure, allowing you to focus on business logic.
- Consistency: Ensures that every new feature follows the same structure and conventions, which improves maintainability.
- Convenience: Eliminates repetitive tasks and speeds up the development process.

Side Effects
By using this custom command, the following benefits are achieved:

- Reduced Setup Time: Developers can start working on the actual business logic almost immediately.
- Minimized Errors: The generated code adheres to best practices and reduces the likelihood of human error.
- Enhanced Developer Experience: A streamlined workflow that enhances productivity and satisfaction among developers.

### Conclusion:

Actually, there are plenty other approaches to make our code cleaner and easier to read for humans. However, at this time, I'd want to underline the two points listed above. Because, as previously said, I am using the same code approach in my project.

As a result, I ask any creators who want to participate in this project to keep the previously created code consistent.

## 📖 Notes

When we wish to include a new package or library into this project. I ask that you first conduct some study on the package or library that you intend to utilize.

When it comes to adding a new package or library, there are various factors to consider. Among them are:

1. Is the package or library frequently updated by its creator?
2. Is the package or library popular with other developers?
3. Does the package or library have a lot of issues?
4. Is the package or library small in size?
5. Is the package or library simple to use and has a big impact on our project? etc.

I believe we can add the desired package or library once it has passed the five criteria outlined above. However, if you wish to start a conversation regarding the package or library you want to add, please do so in the project's discussion thread on GitHub.

## 🎖️ Web Technologies

| Technology | Description                                                                                                                                                                      | Version |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| NestJS     | Nest is a framework for building efficient, scalable Node.js server-side applications. It uses modern JavaScript, is built with TypeScript combines elements of OOP, FP, and FRP | latest  |
| Typescript | JavaScript with syntax for types                                                                                                                                                 | latest  |
| TypeORM    | Data-Mapper ORM for TypeScript, ES7, ES6, ES5. Supports MySQL, PostgreSQL, MariaDB, SQLite, MS SQL Server, Oracle, MongoDB databases.                                            | latest  |
| JWT        | Nest - modern, fast, powerful node.js web framework (@jwt)                                                                                                                       | latest  |

## 🏅 Dependencies & Libraries

| Library           | Description                                                                                                               | Version |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| @nestjs/common    | Nest - modern, fast, powerful node.js web framework (@common)                                                             | latest  |
| @nestjs/config    | Nest - modern, fast, powerful node.js web framework (@config)                                                             | latest  |
| @nestjs/core      | Nest - modern, fast, powerful node.js web framework (@core)                                                               | latest  |
| @nestjs/jwt       | Nest - modern, fast, powerful node.js web framework (@jwt)                                                                | latest  |
| @nestjs/passport  | Nest - modern, fast, powerful node.js web framework (@passport)                                                           | latest  |
| @nestjs/swagger   | Nest - modern, fast, powerful node.js web framework (@swagger)                                                            | latest  |
| @nestjs/typeorm   | Nest - modern, fast, powerful node.js web framework (@typeorm).                                                           | latest  |
| bcrypt            | A bcrypt library for NodeJS.                                                                                              | latest  |
| class-transformer | Proper decorator-based transformation / serialization / deserialization of plain javascript objects to class constructors | latest  |
| class-validator   | Decorator-based property validation for classes.                                                                          | latest  |
| compression       | Node.js compression middleware.                                                                                           | latest  |
| husky             | Modern native Git hooks.                                                                                                  | latest  |
| pg                | PostgreSQL client - pure javascript & libpq with the same API                                                             | latest  |
| typeorm-extension | A library to create/drop database, simple seeding data sets                                                               | latest  |

## 🛠️ Setup Project

To get this project up and running in your development environment, follow these step-by-step instructions.

### 🍴 Prerequisites

We need to install or make sure that these tools are pre-installed on your machine:

- [NestJS](https://docs.nestjs.com): Nest (NestJS) is a framework for building efficient, scalable Node.js server-side applications.
- [NodeJS](https://nodejs.org/en/download/): It is a JavaScript runtime build.
- [Git](https://git-scm.com/downloads): It is an open source version control system.

## 🔍 Usage

### How To Use

To clone and run this application, you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

### 🚀 Install Project

1. Clone the Repository

```bash
git clone https://github.com/existhink/NestJS-Starter-Kit.git
```

2. Install dependencies using bun

```shell
bun or bun install
```

3. Change **.env.example** to **.env**

You must change the .env.example to .env and match it with you local machine.

4. Run project for development

```shell
bun start:dev
```

### 🐳 Local Services (Docker)

`bun run dev:up` starts only the backing services — PostgreSQL 17 and Redis 7 — and
leaves the app itself on your host so `start:dev` keeps its watch mode and debugger.
The `app` service in `docker-compose.yml` is there for a fully containerised run
(`docker compose up`) and is not needed for day-to-day development.

```shell
bun run dev:up      # start postgres + redis in the background
bun run dev:logs    # tail their logs
bun run dev:down    # stop them, keep the data
bun run dev:reset   # stop them and DELETE the postgres volume
```

Both containers publish on the ports from your `.env` (`DATABASE_PORT`, `REDIS_PORT`),
so the default `.env.example` values work unchanged. Once they report healthy, apply
the schema with `bun run migration:run`.

> **Port already in use?** If you already run PostgreSQL or Redis natively (Homebrew,
> Postgres.app, another project's stack), `dev:up` fails with `ports are not available:
... address already in use`. Pick free host ports in `.env` — for example
> `DATABASE_PORT=55432` and `REDIS_PORT=56379`. The same variables configure the app's
> own connection, so it follows the containers automatically; only the host-side port
> changes, and the containers keep listening on 5432/6379 internally.
>
> Note that `lsof -i :5432` can come back empty even when the port is taken, because it
> hides sockets owned by other users (a native Postgres runs as the `postgres` user).
> `netstat -an -p tcp | grep 5432` is the reliable check.

> **`$` in a password, and `.env.local`.** Two parsers read your environment and they do
> not agree. `docker compose` reads **only `.env`**; `bun` reads `.env` and then lets
> `.env.local` override it. So a stale `.env.local` silently points the app at a different
> port than the one Compose published, and the failure surfaces as
> `password authentication failed` against whatever else is listening there.
>
> On top of that, bun expands `$` inside `.env` values — in **every** quoting style. A
> password of `IT24680@$^*)` arrives as `IT24680@^*)` whether you write it bare, in single
> quotes, or in double quotes. Only a backslash escape survives, and Compose reads that
> same spelling correctly:
>
> ```shell
> DATABASE_PASSWORD="IT24680@\$^*)"   # the only form both parsers agree on
> ```
>
> Verify with `bun -e 'console.log(process.env.DATABASE_PASSWORD)'` rather than trusting
> the file — that one command would have caught both problems immediately.

> **Upgrading from an older checkout:** the Postgres image moved from `16.4-alpine` to
> `17-alpine`. Postgres will not start on a data directory written by an older major —
> it exits with `FATAL: database files are incompatible with server`. If you already ran
> the previous compose file, drop the volume first with `bun run dev:reset` (this
> destroys local data) or migrate it with `pg_upgrade`.

---

## 🎉 Build The App

1. Build the app

```shell
bun run build
```

## 🧪 Test

Run test across all files

```shell
bun run test:unit
```

### Coverage baseline

Coverage is measured against **business logic only**. Infrastructure glue is excluded
from `collectCoverageFrom` (`configurations/`, `database/`, `strategies/`, `guards/`,
`*.decorator.ts`, `instrumentation.ts`) because those files are thin wrappers whose
correctness is proven by the app booting, not by unit tests.

Baseline as of the bun migration (33 tests, 6 suites):

| Metric     | Achieved | Threshold |
| ---------- | -------- | --------- |
| Statements | 69.65%   | 64%       |
| Branches   | 44.87%   | 39%       |
| Functions  | 72.97%   | 67%       |
| Lines      | 70.10%   | 65%       |

Thresholds sit ~5% under the achieved numbers so CI fails on regression, not on noise.
**Ratchet them up whenever you add tests** — the gate should only ever move forward.

Largest gaps worth closing first: `context.interceptor.ts` and
`request-context.middleware.ts` (both 0%), and `users.controller.ts` (0%).

---

## 📂 Folder Structure

Project structure for this react starter

```javascript

.husky
|   |_______pre-commit                            // Pre-commit hook for husky.
src                                               // Entry point for the app.
|   |_______common                                // Contain all common for the app.
|   |   |_______constants                         // Contain all constants for the app.
|   |   |_______decorators                        // Contain all decorators for the app.
|   |   |_______dtos                              // Contain all dtos for the app.
|   |   |_______entities                          // Contain all entities for the app.
|   |   |_______guards                            // Contain all guards for the app.
|   |   |_______helpers                           // Contain all helpers for the app.
|   |   |_______interceptors                      // Contain all interceptors for the app.
|   |   |_______strategies                        // Contain all strategies for the app.
|   |_______configurations                        // Contain all configurations for the app.
|   |   |_______app                               // Contain core app configurations for the app.
|   |   |_______database                          // Contain database configurations for the app.
|   |   |_______jwt                               // Contain jwt configurations for the app.
|   |   |_______swagger                           // Contain swagger configurations for the app.
|   |_______database                              // Contain all database for the app including datasource and provider.
|   |_______modules                               // Contain all modules for the app.
|   |   |_______authentication                    // Contain all strategies for the app.
|   |   |   |_______controllers                   // Contain all controllers for authentication module.
|   |   |   |_______dtos                          // Contain all dtos for authentication module.
|   |   |   |_______entities                      // Contain all entities for authentication module.
|   |   |   |_______interfaces                    // Contain all interfaces for authentication module.
|   |   |   |_______services                      // Contain all services for authentication module.
|   |   |   |_______authentication.module.ts      // Main module for authentication module.
|   |   |_______{module-name}                     // Example module.
test                                              // Contain all test for the app.
```

### ⚒️ How to Contribute

Want to contribute? Great!

To fix a bug or enhance an existing module, follow these steps:

- Fork the repo
- Create a new branch (`git checkout -b improve-feature`)
- Make the appropriate changes in the files
- Add changes to reflect the changes made
- Commit your changes (`git commit -am 'Improve feature'`)
- Push to the branch (`git push origin improve-feature`)
- Create a Pull Request

### 📩 Bug / Feature Request

If you find a bug (the website couldn't handle the query and / or gave undesired results), kindly open an issue [here](https://github.com/existhink/NestJS-Starter-Kit/issues/new) by including your search query and the expected result.

If you'd like to request a new function, feel free to do so by opening an issue [here](https://github.com/existhink/NestJS-Starter-Kit/issues/new). Please include sample queries and their corresponding results.

## 📜 Credits

List your collaborators, if any, with links to their GitHub profiles.

I'd like to acknowledge my collaborators, who contributed to the success of this project. Below are links to their GitHub profiles.

Furthermore, I utilized certain third-party assets that require attribution. Find the creators' links in this section.

If I followed tutorials during development, I'd include the links to those as well.

👦 Rafi Khoirulloh <br>
Email: khoirulloh.rafi2@gmail.com <br>
GitHub: @apiiyu

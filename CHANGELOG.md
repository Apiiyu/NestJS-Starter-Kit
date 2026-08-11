# Changelog

## 1.0.0 (2026-08-05)


### Features

* **auth:** add refresh and logout endpoints ([c73bc27](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/c73bc27ce0b620eaf7d2c058fa25405e3ab42b0f))
* **auth:** add refresh token rotation with reuse detection ([b087f94](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/b087f94a992ef5be7585f4cc685a78dd4728d075))
* **auth:** add user roles and harden JWT claims ([a78b783](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/a78b78382833f1600b0927ebab564f81005685b0))
* **cache:** replace anonymous query cache with invalidatable named keys ([8cff95c](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/8cff95cd343aa4d4b90117ed41405a0994c4a00a))
* **common:** add global exception filter with stable error codes ([ac1a663](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/ac1a663496e55362ea1f55025cc5036bc45af87c))
* **common:** add RolesGuard and stop excluding guards from coverage ([1d8a967](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/1d8a967845cff7101c3530358b8c274d3671a397))
* **db:** make TypeORM migrations first-class ([2ffe1a3](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/2ffe1a35251c12a48cc3acbb1f2778d1c5e1266a))
* **db:** unify audit timestamps to timestamptz and fix soft-delete ([1d2559f](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/1d2559fbb15c887eb0a7e2ed6f15c3f129f0e5d0))
* **db:** upgrade to TypeORM 1.x and fix the broken users endpoint ([9614bfc](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/9614bfcc61053101d796431dff36610b34ddf6d4))
* **mail:** wire nodemailer welcome email via bullmq and mailpit ([cc589c0](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/cc589c0d1194264e49fbcaa55ef2e500be3d485e))
* **NO-TICKET:** harden runtime config and add request observability ([33d7714](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/33d7714f7b7922ee3baf41caa1191b5f65b8f7f0))
* **observability:** correlate traces and protect Prometheus scrapes ([9e365e7](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/9e365e7007b62d8d532e3994cbb49a58bc880d98))
* **queue:** provision phase 2b infra and wire bullmq maintenance queue ([0d2a4b3](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/0d2a4b3fe8811fe8423d362d07e380480522a8cb))
* **security:** replace seven hand-maintained setHeader calls in main.ts ([c5cae62](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/c5cae62fd1359a5cfb4845da3a8eb2c552daf51a))
* **users:** fill in UsersController and drop the anonymous query cache ([ada4c0d](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/ada4c0ddc3ae99cbb05c10241bf0b528620eea70))


### Bug Fixes

* **auth:** enforce the password policy, and make e2e run the real application ([e5ff839](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/e5ff83997a3a9a1f47eab412e1e5356f628ada11))
* **build:** keep scripts out of dist and type-check what nobody was checking ([d4bfb79](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/d4bfb799405e6f503706c5619bd7c13511561cef))
* **cache,mail:** fail-open cache errors and add mail job retries ([5580b56](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/5580b56be785e63c883d0d565e1a36583955a14f))
* **deps:** clear 39 of 40 security advisories ([12e1551](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/12e15518a246b88279fa64b0b90951c73e47e9a7))
* **deps:** drop the vulnerable jws from the token verification path ([fad31df](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/fad31df38b39b190ede06dc6d3ebb4a81818c4fa))
* **health:** slim public payload and fix empty data envelope ([2a36327](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/2a36327af92790b3e16a96e1d63b9471c2d19555))
* repair the HTTP request path, found by runtime verification ([3540f5b](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/3540f5b592528903ddd368215506f166006e5cbf))
* **sdk:** keep generated artifacts outside application compilation ([cfe861f](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/cfe861f79b93cf21e6787a176e3a2b4b8c043ab4))
* **security:** close two prototype-chain holes the linter had been flagging ([a99a2cd](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/a99a2cd616cde6bcf144fd6e6c853d92543e1078))
* **security:** replace stale js-yaml exception with patched override ([e2e853b](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/e2e853b57de5be9d6984b67f184d4ed796cf61d2))
* the migration:* scripts added in the previous commit's body were ([c5cae62](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/c5cae62fd1359a5cfb4845da3a8eb2c552daf51a))
* **users:** enforce unique email and username on live rows ([7048af7](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/7048af7c957e7f92351311764f96a0536effc4f2))


### Performance Improvements

* **test:** swap ts-jest for @swc/jest and drop ts-node ([fc6603c](https://github.com/Apiiyu/NestJS-Starter-Kit/commit/fc6603c411ca195d7038c701045bc489a70070eb))

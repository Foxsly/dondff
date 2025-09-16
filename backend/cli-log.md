```belcheti@Tims-MacBook-Pro dondff % nest new dondff
✨  We will scaffold your app in a few seconds..

✔ Which package manager would you ❤️  to use? npm
(node:4584) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
CREATE dondff/.prettierrc (51 bytes)
CREATE dondff/README.md (5028 bytes)
CREATE dondff/eslint.config.mjs (836 bytes)
CREATE dondff/nest-cli.json (171 bytes)
CREATE dondff/package.json (1977 bytes)
CREATE dondff/tsconfig.build.json (97 bytes)
CREATE dondff/tsconfig.json (677 bytes)
CREATE dondff/src/app.controller.ts (274 bytes)
CREATE dondff/src/app.module.ts (249 bytes)
CREATE dondff/src/app.service.ts (142 bytes)
CREATE dondff/src/main.ts (228 bytes)
CREATE dondff/src/app.controller.spec.ts (617 bytes)
CREATE dondff/test/jest-e2e.json (183 bytes)
CREATE dondff/test/app.e2e-spec.ts (674 bytes)

✔ Installation in progress... ☕

🚀  Successfully created project dondff
👉  Get started with the following commands:

$ cd dondff
$ npm run start
```

```
belcheti@Tims-MacBook-Pro dondff % nest g resource
(node:7325) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
✔ What name would you like to use for this resource (plural, e.g., "users")? users
✔ What transport layer do you use? REST API
✔ Would you like to generate CRUD entry points? Yes
CREATE src/users/users.controller.spec.ts (566 bytes)
CREATE src/users/users.controller.ts (894 bytes)
CREATE src/users/users.module.ts (248 bytes)
CREATE src/users/users.service.spec.ts (453 bytes)
CREATE src/users/users.service.ts (609 bytes)
CREATE src/users/dto/create-user.dto.ts (30 bytes)
CREATE src/users/dto/update-user.dto.ts (169 bytes)
CREATE src/users/entities/user.entity.ts (21 bytes)
UPDATE package.json (2010 bytes)
UPDATE src/app.module.ts (312 bytes)
⠋ Installing packages (npm)...(node:7326) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
✔ Packages installed successfully.
belcheti@Tims-MacBook-Pro dondff % nest g resource
(node:7688) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
✔ What name would you like to use for this resource (plural, e.g., "users")? leagues
✔ What transport layer do you use? REST API
✔ Would you like to generate CRUD entry points? Yes
CREATE src/leagues/leagues.controller.spec.ts (586 bytes)
CREATE src/leagues/leagues.controller.ts (936 bytes)
CREATE src/leagues/leagues.module.ts (262 bytes)
CREATE src/leagues/leagues.service.spec.ts (467 bytes)
CREATE src/leagues/leagues.service.ts (637 bytes)
CREATE src/leagues/dto/create-league.dto.ts (32 bytes)
CREATE src/leagues/dto/update-league.dto.ts (177 bytes)
CREATE src/leagues/entities/league.entity.ts (23 bytes)
UPDATE src/app.module.ts (385 bytes)
belcheti@Tims-MacBook-Pro dondff % nest g resource
(node:7712) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
✔ What name would you like to use for this resource (plural, e.g., "users")? teams
✔ What transport layer do you use? REST API
✔ Would you like to generate CRUD entry points? Yes
CREATE src/teams/teams.controller.spec.ts (566 bytes)
CREATE src/teams/teams.controller.ts (894 bytes)
CREATE src/teams/teams.module.ts (248 bytes)
CREATE src/teams/teams.service.spec.ts (453 bytes)
CREATE src/teams/teams.service.ts (609 bytes)
CREATE src/teams/dto/create-team.dto.ts (30 bytes)
CREATE src/teams/dto/update-team.dto.ts (169 bytes)
CREATE src/teams/entities/team.entity.ts (21 bytes)
UPDATE src/app.module.ts (450 bytes)
```
### Updating kysely generated entities
```
npm run kysely-codegen
```
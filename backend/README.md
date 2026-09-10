<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## DB Migrations

This project uses **Kysely** with a custom migration runner.

Migration files live in:

```
src/infrastructure/database/migrations/
```

Each migration file exports:

```ts
export async function up(db) { ... }
export async function down(db) { ... }
```

---

### 📦 Create a New Migration

Create a new file under the migrations directory using the naming convention:

```
YYYYMMDDHHMM__description.ts
```

Example:

```
202501121830__team_player_string_id.ts
```

---

### 🚀 Run Migrations

Run all pending migrations:

```bash
npm run migrate
```

This will:

- Detect newly added migration files
- Apply their `up()` functions in order
- Record applied migrations in the database

---

### 🔄 Roll Back Migrations

Roll back the most recent migration:

```bash
npm run migrate down
```

Roll back multiple migrations:

```bash
npm run migrate down 3
```

---

### 🧪 Running Migrations

Migrations run against Postgres. Provide the connection via `DATABASE_URL` (e.g. in `backend/.env`):

```bash
export DATABASE_URL="postgres://user:pass@host:5432/db"
npm run migrate
```

---

## Local Development with Docker

You can run the backend locally using Docker and Docker Compose. This is the recommended way to run against a Postgres database in a setup that is closer to production.

### Prerequisites

- Docker
- Docker Compose (v2 or integrated Docker Compose support)

### Basic Usage

From the `backend` directory:

```bash
# Build images and start services in the background
docker compose up -d --build

# View logs
docker compose logs -f
```

By default this will:

- Start a Postgres container
- Start the backend API container
- Configure the backend to use Postgres as the primary database (via `DATABASE_URL`)

### Applying Migrations in Docker

Once the containers are running, run migrations inside the **backend** service to ensure the database schema is up to date:

```bash
# Confirm services are running (look for the `backend` service)
docker compose ps

# Run migrations inside the backend service
docker compose exec backend npm run migrate
```

### Environment Variables

The Docker Compose file is responsible for setting the core environment variables (for example `DATABASE_URL`, `NODE_ENV=production`, `PORT=3001`).

If you need to override or add local-only settings, you can use a `.env` file alongside `docker-compose.yml`. Docker Compose will automatically load values from `.env`.

### Stopping and Cleaning Up

To stop the containers:

```bash
docker compose down
```

To remove containers, networks, and anonymous volumes:

```bash
docker compose down -v
```

This will not remove your local source code, only Docker resources.

## Running in Production with Docker

You can also run this backend in a production-like environment using Docker and Docker Compose. The same `docker-compose.yml` file can be used on a server with appropriate environment variables and secure credentials.

### Basic Production Flow

On your server (e.g. cloud VM, bare metal, or a home lab):

```bash
# Copy source code or deployment artifacts to the server
# Ensure Node, Docker, and Docker Compose are installed

# Build and start services in the background
docker compose up -d --build

# Check service status
docker compose ps

# Tail logs (backend + database)
docker compose logs -f
```

### Production Environment Variables

For production, you should:

- Use strong, non-default credentials for Postgres (`POSTGRES_USER`, `POSTGRES_PASSWORD`).
- Set a production-ready `DATABASE_URL` (matching your Postgres credentials/host).
- Set `NODE_ENV=production`.

You can store these in a `.env` file alongside `docker-compose.yml` on the server. Docker Compose will automatically pick up values from `.env`.

### Migrations in Production

After deploying or updating the backend image, run database migrations inside the backend service:

```bash
docker compose exec backend npm run migrate
```

This keeps your database schema in sync with the application code.

### Reverse Proxy and TLS (Optional)

In a real production deployment, you would typically place this backend behind a reverse proxy such as Nginx, Caddy, or a cloud load balancer. That proxy would terminate TLS (HTTPS) and forward traffic to the backend container on port `3001`.

This repository does not enforce a specific proxy setup, but you should ensure that:

- External traffic hits the reverse proxy, not the container directly.
- TLS certificates are managed by the proxy or a platform service.
- Only necessary ports are exposed from the host.
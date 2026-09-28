# ContentFlow AI API

Backend del MVP de ContentFlow AI, construído con NestJS, Prisma, PostgreSQL y Redis/BullMQ.

## Stack

- NestJS 10
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis + BullMQ
- JWT

## Requisitos locales

- Node.js 20+
- Docker Desktop
- npm

## Arranque rápido

```bash
cd apps/api
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

## Servicios requeridos

```bash
docker compose -f docker-compose.dev.yml up -d
```

## Variables de entorno mínimas

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_SECRET`

## Endpoints MVP

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Workspaces
- `GET /workspaces`
- `POST /workspaces`
- `GET /workspaces/:workspaceId`
- `PUT /workspaces/:workspaceId`
- `DELETE /workspaces/:workspaceId`

### Posts
- `GET /workspaces/:workspaceId/posts`
- `POST /workspaces/:workspaceId/posts`
- `PATCH /workspaces/:workspaceId/posts/:id`
- `DELETE /workspaces/:workspaceId/posts/:id`
- `POST /workspaces/:workspaceId/posts/:id/generate-variants`

### Media assets
- `GET /media-assets`
- `POST /media-assets`
- `GET /media-assets/:id`
- `DELETE /media-assets/:id`

### Social accounts
- `GET /social-accounts`
- `POST /social-accounts/connect`
- `POST /social-accounts/:id/sync`
- `POST /social-accounts/:id/refresh-token`
- `DELETE /social-accounts/:id`

### Scheduler
- `POST /workspaces/:workspaceId/posts/:postId/schedule`
- `POST /workspaces/:workspaceId/posts/:postId/publish-now`
- `POST /workspaces/:workspaceId/posts/:postId/cancel-schedule`
- `GET /workspaces/:workspaceId/posts/:postId/publication-jobs`

## Health

```bash
curl http://localhost:3000/health
```

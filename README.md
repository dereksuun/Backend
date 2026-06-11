# Derycash Backend

API e regras de negocio do Derycash.

## Direcao inicial

- API separada do frontend para manter os repos independentes.
- Stack: TypeScript, Express para desenvolvimento local, Prisma e Postgres.
- Deploy futuro: Vercel Functions ou adaptacao para API dentro do Next.js, se decidirmos unificar.
- Banco local: Docker Compose com Postgres.

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run prisma:generate
npm run prisma:migrate
```

## Banco local

```bash
docker compose up -d postgres
```

Copie `.env.example` para `.env` antes de rodar Prisma/API.

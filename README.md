# PeerSV portaal

Ledenadministratie voor voetbalclub PeerSV. Next.js 15 (App Router) + TypeScript + Tailwind v4 + Drizzle ORM + PostgreSQL.

## Vereisten

- Node.js 20+
- Docker (voor lokale Postgres)
- npm

## Opstartstappen

1. Installeer dependencies.

   ```bash
   npm install
   ```

2. Kopieer de env voorbeeld (al gedaan bij setup, nodig na een fresh clone).

   ```bash
   cp .env.example .env.local
   ```

3. Start Postgres.

   ```bash
   docker compose up -d
   ```

4. Push het Drizzle schema naar de database.

   ```bash
   npm run db:push
   ```

5. (Optioneel) Laad voorbeeldleden.

   ```bash
   npm run db:seed
   ```

6. Start de dev server.

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Scripts

| Script | Doel |
| --- | --- |
| `npm run dev` | Start Next.js in dev mode |
| `npm run build` | Productie build |
| `npm run start` | Start productie build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Genereer SQL migrations vanuit `src/db/schema.ts` |
| `npm run db:migrate` | Pas pending migrations toe |
| `npm run db:push` | Sync schema direct met de DB (handig in dev) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Laad voorbeelddata |

## Structuur

```
src/
  app/
    layout.tsx        Globale layout + header/footer
    page.tsx          Dashboard
    leden/page.tsx    Ledenoverzicht
  db/
    index.ts          Drizzle client
    schema.ts         Drizzle schema (members)
    seed.ts           Voorbeelddata
drizzle.config.ts     Drizzle Kit configuratie
docker-compose.yml    Lokale Postgres
```

## Database

`docker-compose.yml` start Postgres 16 op `localhost:5432` met:

- user: `peersv`
- password: `peersv`
- database: `peersv`

Connection string in `.env.local`:

```
DATABASE_URL=postgres://peersv:peersv@localhost:5432/peersv
```

Stoppen: `docker compose down`. Data en volume wissen: `docker compose down -v`.

## Auth

Auth.js v5 met credentials provider (e-mail + wachtwoord, bcrypt). `/dashboard` is beschermd via middleware. `/` redirect naar `/dashboard` (of `/login` als je niet ingelogd bent).

Seed accounts:

| E-mail | Wachtwoord | Rol |
| --- | --- | --- |
| admin@peersv.be | admin123 | admin |
| trainer@peersv.be | trainer123 | trainer |
| vlinder@peersv.be | trainer123 | trainer (vlinder) |

`AUTH_SECRET` zit in `.env.local`. Genereer een nieuwe via `openssl rand -base64 32`.

## Volgende stappen

- CRUD endpoints / server actions voor leden, teams, trainers
- Rollen-gebaseerde authorisatie (admin vs trainer)
- Lidmaatschapsbijdragen

# RO Accountability

Next.js replacement for the original Power Apps workflow. The app provides:

- Dispatcher blocker entry and blocker clearing
- Advisor-only blocked RO board with customer-contact tracking
- Manager dashboard with daily CSV import, KPI rollups, skipped-row reporting, and audit history
- Manager user admin for creating dispatcher, advisor, and manager logins

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Postgres
- Prisma
- NextAuth credentials login

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a Postgres database.
3. Set `AUTH_SECRET` to a long random string.
4. Run:

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

The seed creates the initial manager user from:

- `SEED_MANAGER_EMAIL`
- `SEED_MANAGER_PASSWORD`
- `SEED_MANAGER_NAME`

## Daily import contract

The manager import expects the exact Xtime CSV header:

```text
RO,Tag,Promised,Model,Year,Customer,Flags,Phone,ASM,Tech,Mode,MT,TT,MT Display,TT Display
```

Required source fields:

- `RO`
- `ASM`
- `Customer`
- `Model`
- `Year`
- `Promised`
- `Mode`

`Promised` normalization rules:

- `M/D/YYYY` -> stored as a normalized date
- `W MM-DD-YY` -> stripped and parsed as a date
- `H:MM AM/PM` -> anchored to the import date
- `W H:MM am/pm` -> anchored to the import date

Blank trailer rows are skipped. Invalid rows are recorded in `ImportRowError` and shown in the manager import summary.

## Verification

```bash
npm run lint
npm run test
npm run build
```

# Hourline

Hourline is a production-style web application for tracking monthly hours by client and project. It supports Managed Service allocations with carryover, Time & Materials usage tracking, dashboards, reports, and role-based administration.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS + custom UI primitives
- Auth.js (NextAuth v5) with credential authentication
- Prisma ORM
- SQLite for local development (PostgreSQL-ready)
- Recharts, Vitest, ExcelJS

## Local setup

Requirements: Node.js 20+.

```bash
cp .env.example .env
npm install
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

| User ID | Password   | Role  |
| ------- | ---------- | ----- |
| admin   | admin123   | ADMIN |
| analyst | analyst123 | USER  |

On the login page, **Use Demo Account** fills in `admin` / `admin123`. It does not sign you in automatically.

Passwords are stored as bcrypt hashes. Change `AUTH_SECRET` before deploying.

## Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Run carryover/calculation unit tests |
| `npm run setup` | Generate Prisma client, apply migrations, seed data |
| `npm run db:studio` | Open Prisma Studio |

## Business rules

Monthly hours are calculated in `src/lib/calculations.ts`. UI screens call that module instead of reimplementing formulas.

**Current month available hours (Managed Service)**

`Hours Available = Monthly Hours + carryover from prior remaining`

Unused hours carry in, capped by Maximum Carryover Hours. Negative remaining hours (over-allocation) are subtracted from the next month's available hours.

**Hours for next month**

`MIN(Hours Remaining + Monthly Hours, 2 × Monthly Hours)`

Maximum carryover (how much unused time can enter the current month) is a separate cap from the 2× monthly hours ceiling on next-month availability.

Time & Materials projects store hours used only. They have no monthly allocation, carryover, remaining hours, or utilization status.

Deactivating a client or project is a soft action. Historical time entries are retained.

## Roles

- **ADMIN** — dashboard, time entry, reports, user/client/project administration, finance settings
- **USER** — dashboard, time entry, read-only clients/projects, reports

## Finance email

Each client can have one or more finance email addresses, edited on the client record. **Email Finance** opens a prefilled `mailto:` message to those client contacts for the selected period. Administration → Finance Settings stores a separate **generic** company finance email. The `/api/clients/[id]/email-finance` route is the extension point for SendGrid, Microsoft Graph, or another provider.

## PostgreSQL (production)

Local development uses SQLite so the app runs without Docker:

```
DATABASE_URL="file:./dev.db"
```

To use PostgreSQL:

1. `docker compose up -d`
2. Change `provider = "postgresql"` in `prisma/schema.prisma`
3. Set `DATABASE_URL="postgresql://hourline:hourline@localhost:5432/hourline?schema=public"`
4. Run `npx prisma migrate dev`

## Assumptions

- Duplicate client names are rejected case-insensitively.
- Duplicate project names are rejected within a client, but the same name may exist under different clients.
- Finance email is optional, but must be a valid email when provided.
- Months with no time entry are treated as 0 hours used when walking the carryover chain from the project created date.
- Utilization bands: 0–74% healthy, 75–89% approaching limit, 90–100% at limit, over 100% over allocation.

## Tests

```bash
npm test
```

The suite covers the required allocation, carryover, next-month cap, over-allocation, and Time & Materials scenarios.

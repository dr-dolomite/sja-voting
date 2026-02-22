# SJA Voting System

A locally-hosted student leader voting system for school elections. Built with **Next.js 16**, **ShadCN UI**, and **PostgreSQL**.

## Features

- **LRN-based authentication** — Students log in using their Learner Reference Number (no passwords needed)
- **Admin dashboard** — Manage elections, voters, partylists, candidates, and admin accounts
- **Spreadsheet import** — Bulk-import voters from `.xlsx` or `.csv` files (Column A = LRN, Column B = Section)
- **Voting ballot** — Clean radio-button UI with candidate photos, partylist badges, and optional descriptions
- **Single-vote enforcement** — Each voter can only cast their ballot once
- **Live results** — Real-time vote counting and statistics with per-section turnout

## Tech Stack

| Layer       | Technology                                       |
| ----------- | ------------------------------------------------ |
| Framework   | Next.js 16 (App Router, Server Actions, RSC)     |
| UI          | ShadCN (new-york style), Tailwind CSS v4, Lucide |
| ORM         | Prisma                                           |
| Database    | PostgreSQL (local)                               |
| Runtime     | Bun                                              |
| Auth        | Custom JWT via `jose` (fully offline)            |
| File Import | `xlsx` (SheetJS)                                 |

## Prerequisites

- [Bun](https://bun.sh) installed
- [PostgreSQL](https://www.postgresql.org/) installed and running locally

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sja_voting"
JWT_SECRET="your-secret-key-here"
```

### 3. Set up the database

```bash
bunx prisma migrate dev --name init
bunx prisma db seed
```

This creates all tables and seeds a default admin account:

- **Username:** `admin`
- **Password:** `admin123`

> ⚠️ Change the default admin password after first login via the Admin Manager page.

### 4. Run the dev server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── (auth)/login/          # Login page (voter + admin tabs)
├── (admin)/admin/
│   ├── page.tsx           # Dashboard overview
│   ├── voters/            # Voter management + spreadsheet import
│   ├── partylists/        # Partylist CRUD
│   ├── candidates/        # Candidate CRUD + image upload
│   ├── elections/         # Election & position management
│   ├── results/           # Live counting + statistics
│   └── admins/            # Admin account management
├── (voter)/vote/          # Voting ballot
└── api/upload/            # Candidate image upload
lib/
├── db.ts                  # Prisma client singleton
├── auth.ts                # JWT + bcrypt utilities
└── actions/               # Server Actions (auth, voters, candidates, etc.)
prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Default admin seeder
```

## Data Models

- **Admin** — Admin accounts (username + hashed password)
- **Election** — Named elections with an active/inactive toggle
- **Position** — Ordered positions within an election (e.g., President, VP)
- **Partylist** — Political partylists with a display color
- **Candidate** — Tied to a position + partylist, with optional photo & bio
- **Section** — Student sections (auto-created during import)
- **Voter** — Identified by LRN, linked to a section, tracked for vote status
- **Vote** — Links a voter to a candidate (unique constraint prevents duplicates)

## Voter Import Format

Prepare a `.xlsx` or `.csv` file with:

| Column A (LRN) | Column B (Section)   |
| -------------- | -------------------- |
| 123456789012   | Grade 10 - Rizal     |
| 123456789013   | Grade 10 - Rizal     |
| 123456789014   | Grade 10 - Bonifacio |

Sections are auto-created if they don't already exist.

## Routes & Auth

| Route           | Access | Description            |
| --------------- | ------ | ---------------------- |
| `/login`        | Public | Login page             |
| `/admin/*`      | Admin  | Admin dashboard pages  |
| `/vote`         | Voter  | Voting ballot          |
| `/vote/success` | Voter  | Post-vote confirmation |

Auth is handled via `HttpOnly` JWT cookies. Middleware enforces role-based access.

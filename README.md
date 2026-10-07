# Library Management System

A monolithic, single-repo library management app:

| Layer    | Tech                                              | Folder      |
| -------- | ------------------------------------------------- | ----------- |
| Frontend | React 18 + TypeScript + Vite + React Router       | `frontend/` |
| Backend  | NestJS 10 + TypeORM + class-validator             | `backend/`  |
| Database | Local SQLite file (`better-sqlite3`)              | `database/` |

In production the NestJS server serves the built React app **and** the REST API from one port (`http://localhost:3000`).

Detailed docs live in [`docs/knowledge-base/`](docs/knowledge-base/): [Project overview](docs/knowledge-base/PROJECT_OVERVIEW.md) · [Architecture](docs/knowledge-base/ARCHITECTURE.md) · [Database](docs/knowledge-base/DATABASE.md) · [API conventions](docs/knowledge-base/API_CONVENTIONS.md).

## Features

- **Role-based login** – choose **User** or **Admin** and enter the default password **`1234`**. Admins have full access; users can search books, borrow and return (no book/member editing)
- **Books** – catalogue CRUD, search by title/author/ISBN/category, copy tracking (available / total)
- **Members** – registration, active/inactive status, search
- **Loans** – issue and return books, due dates, overdue detection, late fines
- **Dashboard** – totals, overdue count, recent loans, most borrowed books

Business rules (in `backend/src/loans/loan.rules.ts` and the services):

- A book can only be issued if a copy is available; inactive members cannot borrow
- Max **5** active loans per member, and no two copies of the same title at once
- Default loan period **14 days** (1–60 allowed); fine of **10 per day** late, counted in calendar days
- Books / members with outstanding loans cannot be deleted; total copies cannot drop below copies on loan

## Getting started

Requires Node.js 18+ (tested on Node 22).

```bash
npm install          # installs root, backend and frontend (npm workspaces)
npm run seed         # (re)creates database/library.sqlite with sample data
```

### Run (production / monolith)

```bash
npm run build        # builds frontend/dist and backend/dist
npm start            # http://localhost:3000  (UI)  +  http://localhost:3000/api  (API)
```

Or both in one step (works in Windows PowerShell 5, which does not support `&&`):

```bash
npm run prod
```

### Run (development, hot reload)

```bash
npm run dev          # API on :3000 (nest --watch) + Vite on http://localhost:5173 (proxies /api)
```

The database is auto-seeded on first start if it is empty. Set `AUTO_SEED=false` to disable.
Other environment variables: `PORT` (default `3000`), `DB_PATH` (default `database/library.sqlite`), `AUTH_SECRET` (signs login tokens; if unset a random one is used and everyone is logged out when the server restarts).

## Tests

```bash
npm test             # backend unit tests (Jest) + frontend tests (Vitest + Testing Library)
npm run test:e2e     # backend HTTP end-to-end tests (Supertest, in-memory SQLite)
npm run test:all     # everything
```

Backend unit tests run the real services against a fresh in-memory SQLite database per test.

## REST API

All routes are prefixed with `/api`. Every route except login needs `Authorization: Bearer <token>`; creating, editing or deleting books and members needs the **admin** role (users get `403`). Full access matrix: [API conventions](docs/knowledge-base/API_CONVENTIONS.md).

| Method | Route                  | Description                                          |
| ------ | ---------------------- | ---------------------------------------------------- |
| POST   | `/v1/auth/login`       | Log in `{ role: "admin" \| "user", password: "1234" }` → `{ success, role, token, expiresIn }` |
| GET    | `/v1/auth/me`          | Role behind the current token                        |
| GET    | `/dashboard`           | Statistics, recent loans, top books                  |
| GET    | `/books?search=`       | List / search books                                  |
| GET    | `/books/:id`           | Get a book                                           |
| POST   | `/books`               | Create `{ title, author, isbn, category?, publishedYear?, totalCopies }` |
| PATCH  | `/books/:id`           | Update a book                                        |
| DELETE | `/books/:id`           | Delete a book (no active loans)                      |
| GET    | `/members?search=`     | List / search members                                |
| GET    | `/members/:id`         | Get a member                                         |
| POST   | `/members`             | Create `{ name, email, phone?, active? }`            |
| PATCH  | `/members/:id`         | Update a member                                      |
| DELETE | `/members/:id`         | Delete a member (no active loans)                    |
| GET    | `/loans?status=&memberId=&bookId=` | List loans; `status` = `active` \| `overdue` \| `returned` |
| GET    | `/loans/:id`           | Get a loan                                           |
| POST   | `/loans`               | Issue a book `{ bookId, memberId, loanDays? }`       |
| PATCH  | `/loans/:id/return`    | Return a book (calculates fine)                      |

## Project structure

```
├── package.json            # npm workspaces + root scripts
├── database/               # SQLite file lives here (git-ignored, recreate with `npm run seed`)
├── backend/
│   ├── src/
│   │   ├── books/          # entity, DTOs, service, controller, unit tests
│   │   ├── members/
│   │   ├── loans/          # + loan.rules.ts (due dates, fines, status)
│   │   ├── dashboard/
│   │   ├── database/       # sample data, seed service, `npm run seed` script
│   │   ├── app.module.ts   # TypeORM + serves frontend/dist
│   │   └── main.ts
│   └── test/               # e2e tests
└── frontend/
    └── src/
        ├── api.ts          # typed fetch client
        ├── components/     # BookForm, MemberForm, StatusBadge
        ├── pages/          # Dashboard, Books, Members, Loans (+ tests)
        └── App.tsx
```

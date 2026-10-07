# Architecture

## Shape of the system

One repository, one deployable process. npm **workspaces** tie two packages together; the database is a local file.

```
                 Browser
                    │  http://localhost:3000
                    ▼
┌──────────────────────────────────────────────┐
│ NestJS process (backend/dist/main.js)        │
│                                              │
│  /api/*  ──► Controllers ─► Services ─► TypeORM ─► database/library.sqlite
│  /*      ──► ServeStatic (frontend/dist, SPA fallback to index.html)
└──────────────────────────────────────────────┘
```

- **Production / monolith:** `npm run build` builds `frontend/dist` then `backend/dist`; `npm start` runs Nest, which serves the API under `/api` **and** the built React app on the same port (3000).
- **Development:** `npm run dev` runs two processes via `concurrently`: Nest in watch mode on `:3000` and the Vite dev server on `:5173`. Vite proxies `/api` → `http://localhost:3000`, so the frontend always calls relative `/api/...` URLs.

## Repository layout

```
/
├── package.json                 # workspaces ["backend","frontend"] + root scripts
├── database/                    # SQLite file lives here (library.sqlite is git-ignored)
├── docs/knowledge-base/         # this documentation
├── backend/                     # NestJS API
│   ├── nest-cli.json, tsconfig*.json
│   ├── src/
│   │   ├── main.ts              # bootstrap: create app, configureApp(), listen
│   │   ├── app.setup.ts         # global prefix "api", CORS, ValidationPipe
│   │   ├── app.module.ts        # AppModule.register(options): TypeORM, feature modules, ServeStatic
│   │   ├── config.ts            # PORT, DB_PATH, AUTO_SEED, AUTH_SECRET, frontend dist path
│   │   ├── auth/                # login endpoint, AuthService (JWT), global AuthGuard, @Public/@Roles
│   │   ├── books/               # Book + Review entities, DTOs, BooksService, BooksController (/api/books),
│   │   │                        #   BooksV1Controller (/api/v1/books: paginated list, details, reviews), review.rules.ts
│   │   ├── members/             # Member entity, DTOs, MembersService, MembersController
│   │   ├── loans/               # Loan entity, DTOs, LoansService, LoansController, loan.rules.ts
│   │   ├── dashboard/           # DashboardService (aggregates), DashboardController
│   │   ├── database/            # sample-data.ts, SeedService, seed.ts CLI, DatabaseModule
│   │   └── testing/test-db.ts   # in-memory SQLite testing module helper
│   └── test/                    # e2e tests (app.e2e-spec.ts, jest-e2e.json)
└── frontend/                    # React SPA
    ├── index.html, vite.config.ts (dev proxy + vitest config)
    └── src/
        ├── main.tsx, App.tsx     # AuthProvider + BrowserRouter; login gate, sidebar layout, role-based routes
        ├── auth.tsx              # AuthProvider / useAuth: session (role + token), login, logout
        ├── api.ts                # the only place that calls fetch(); attaches the Bearer token
        ├── types.ts              # TS types mirroring API responses
        ├── utils.ts              # form validation, date formatting
        ├── components/           # BookForm, BookDetailPanel, BookCover, StarRating, ReviewForm, MemberForm, StatusBadge
        ├── pages/                # LoginPage, DashboardPage, BooksPage, MembersPage, LoansPage
        └── test/                 # vitest setup + fixtures
```

## Backend modules

| Module | Responsibility | Depends on (repositories) |
| --- | --- | --- |
| `AuthModule` | `POST /api/v1/auth/login` (role + static password `1234` → JWT), `GET /api/v1/auth/me`; registers the global `AuthGuard` that requires a token on every route and enforces `@Roles('admin')` | `JwtService` (no tables) |
| `BooksModule` | Catalogue CRUD + search; paginated/sorted/filtered list, book details and reviews (`/api/v1/books`); keeps `availableCopies` and the rating summary consistent | `Book`, `Loan`, `Review` + `DataSource` transactions |
| `MembersModule` | Member CRUD + search; unique lower-case email | `Member`, `Loan` |
| `LoansModule` | Issue / return / list loans; all lending rules | `Loan` + `DataSource` transactions over `Book`, `Member` |
| `DashboardModule` | Read-only aggregate stats | `Book`, `Member`, `Loan` |
| `DatabaseModule` | `SeedService`: auto-seed on bootstrap if empty; `seed({reset:true})` for the CLI | `DataSource` |

Request pipeline: global **`AuthGuard`** (token + role check; `@Public()` skips it) → **`ValidationPipe`** → controller.

Layering inside a module: **Controller** (HTTP, param parsing, DTO validation) → **Service** (business rules, throws Nest HTTP exceptions) → **TypeORM Repository / EntityManager**. Pure domain rules (due dates, fines, status) live in `loans/loan.rules.ts` with no framework dependencies.

Borrow and return run inside `dataSource.transaction(...)` so the loan row and the book's `availableCopies` change atomically.

`AppModule.register({ dbPath, serveFrontend, autoSeed })` is a dynamic module so tests can use `':memory:'`, disable static serving and control seeding.

## Frontend

| Route | Page | Roles | API calls |
| --- | --- | --- | --- |
| any, while logged out | `LoginPage` | – | `POST /api/v1/auth/login` |
| `/` | `DashboardPage` | admin, user | `GET /api/dashboard` |
| `/books` | `BooksPage` — master-detail split view (+ `BookDetailPanel`, `BookForm`, `ReviewForm`) | admin: full; user: read-only catalogue + reviews (`canManage={false}`) | `GET /api/v1/books`, `GET /api/v1/books/categories`, `GET /api/v1/books/:id`, `POST /api/v1/books/:id/reviews`, `POST/PATCH/DELETE /api/books` |
| `/members` | `MembersPage` (+ `MemberForm`) | admin only (route not registered for users → redirect to `/`) | `GET/POST/PATCH/DELETE /api/members` |
| `/loans` | `LoansPage` | admin, user | `GET /api/loans?status=`, `GET /api/books`, `GET /api/members`, `POST /api/loans`, `PATCH /api/loans/:id/return` |
| `*` | redirect to `/` | – | – |

- **Auth state:** `AuthProvider` (`src/auth.tsx`) holds the session `{ role, token }`, persists it in `localStorage` (`lms.session`), and passes the token to `api.ts` via `setAuthToken`. `App` renders `LoginPage` until there is a session, then filters sidebar links (`adminOnly`) and routes by role. A 401 from the API logs the visitor out with a "session expired" notice.
- Hiding admin UI is for usability only — the backend `AuthGuard` is what enforces permissions.
- Other state: plain React `useState`/`useEffect` per page; no global store. Pages reload their list after every mutation.
- Search inputs are debounced 250 ms before calling the API.
- **Books split view (REQ-108):** the left pane is a server-paginated table (8 per page) with search, category / availability filters and sort; the right pane shows the selected book (cover, rating, facts, description, reviews) or the inline add/edit form. The first listed book is selected by default, and the selection moves to the first row whenever the selected book leaves the list (page change, filter, delete). A newly added book is pinned to the top of the list with a "New" badge until the query changes, so it is visible even if the current sort/page would not include it. Covers that fail to load fall back to a lettered placeholder (`BookCover`).
- Client-side validation (`utils.ts`) mirrors the backend DTO rules; server errors are still shown via `ApiError.message`.
- Styling: single `index.css`, no UI library.

## Configuration

| Env var | Default | Used by |
| --- | --- | --- |
| `PORT` | `3000` | backend |
| `DB_PATH` | `<repo>/database/library.sqlite` | backend |
| `AUTO_SEED` | `true` (set `false` to disable) | backend – seeds sample data on start if `books` is empty |
| `AUTH_SECRET` | random per process | backend – signs login tokens; set it to keep sessions valid across restarts |

## Scripts (repo root)

| Script | What it does |
| --- | --- |
| `npm run dev` | API (watch) + Vite dev server |
| `npm run build` | Build frontend then backend |
| `npm start` | Run the built monolith |
| `npm run prod` | `build` + `start` |
| `npm run seed` | Reset DB to sample data |
| `npm test` | Backend unit (Jest) + frontend (Vitest) |
| `npm run test:e2e` | Backend HTTP e2e (Supertest, in-memory DB) |
| `npm run test:all` | All of the above |

## Testing strategy

- **Backend unit tests** (`backend/src/**/*.spec.ts`): real services against a fresh **in-memory SQLite** DB per test (`src/testing/test-db.ts`) — no repository mocks. `loan.rules.spec.ts` tests pure functions.
- **Backend e2e** (`backend/test/app.e2e-spec.ts`): full Nest app with `configureApp()`, in-memory DB, auto-seeded, driven over HTTP with Supertest. It logs in as admin and as user in `beforeAll` and checks 401/403 rules.
- **Auth unit tests:** `auth.service.spec.ts` (login, token verification) and `auth.guard.spec.ts` (public / any-role / admin-only routes).
- **Frontend** (`frontend/src/**/*.test.ts(x)`): Vitest + jsdom + Testing Library; `../api` is mocked with `vi.mock`, `api.test.ts` stubs `fetch`.

## Where to put new code

| Change | Location |
| --- | --- |
| New entity / resource | New folder `backend/src/<resource>/` with entity, `dto/`, service, controller, module; register entity in `entities` in `app.module.ts` and import the module there |
| New lending rule | `backend/src/loans/loan.rules.ts` (pure) or `loans.service.ts` (needs DB) |
| New API call from UI | Add a method on `api` in `frontend/src/api.ts` + types in `types.ts` |
| New page | `frontend/src/pages/`, route in `App.tsx`, link in the sidebar `links` array (set `adminOnly` and only register the route for admins if needed) |
| New endpoint permission | `@Roles('admin')` on the controller method; `@Public()` only for login-like routes (`backend/src/auth/auth.constants.ts`) |

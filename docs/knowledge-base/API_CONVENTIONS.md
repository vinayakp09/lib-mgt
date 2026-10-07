# API Conventions

## URL style & versioning

- Base path: **`/api`** (set globally with `app.setGlobalPrefix('api')`). Everything else on the server is the React SPA.
- **All new APIs live under `/api/v1`** (e.g. `/api/v1/auth/login`; controller path `'v1/<resource>'`). The original resources (`/api/books`, `/api/members`, `/api/loans`, `/api/dashboard`) predate this rule and stay unversioned so existing clients keep working.
- Resources are **plural nouns**, lower-case: `/books`, `/members`, `/loans`, `/dashboard`.
- IDs are integers in the path: `/books/:id` (parsed with `ParseIntPipe`; non-numeric → 400).
- Actions that aren't plain CRUD are **sub-resource verbs with PATCH**: `PATCH /loans/:id/return`.
- Filters and search use **query params**: `?search=`, `?status=`, `?memberId=`, `?bookId=`.
- JSON in, JSON out. Field names are **camelCase**, matching entity properties.

## Endpoints

Access: **public** = no token; **any** = admin or user token; **admin** = admin token only (user gets 403).

| Method | Path | Body / query | Access | Success |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | `{ role: "admin" \| "user", password }` | public | 200 `LoginResponse` |
| GET | `/api/v1/auth/me` | – | any | 200 `{ role }` |
| GET | `/api/dashboard` | – | any | 200 `DashboardStats` |
| GET | `/api/v1/books` | `?search=&category=&availability=available\|unavailable&sort=title\|author\|publishedYear\|averageRating\|createdAt&order=asc\|desc&page=&pageSize=` (pageSize 1–50, default 10) | any | 200 `Paginated<Book>` |
| GET | `/api/v1/books/categories` | – | any | 200 `string[]` (distinct, sorted) |
| GET | `/api/v1/books/:id` | – | any | 200 `BookDetail` (book + reviews, newest first) |
| POST | `/api/v1/books/:id/reviews` | `{ reviewerName, rating (1–5 integer), comment? }` | any | 201 `BookDetail` (rating summary recomputed) |
| GET | `/api/books` | `?search=` (title/author/ISBN/category, case-insensitive contains) | any | 200 `Book[]` sorted by title |
| GET | `/api/books/:id` | – | any | 200 `Book` |
| POST | `/api/books` | `{ title, author, isbn, category?, publishedYear?, totalCopies, coverImageUrl?, description? }` (`coverImageUrl` must be an http(s) URL ≤ 500 chars; `description` ≤ 2000) | admin | 201 `Book` |
| PATCH | `/api/books/:id` | any subset of the POST fields | admin | 200 `Book` |
| DELETE | `/api/books/:id` | – | admin | 204 (no body) |
| GET | `/api/members` | `?search=` (name/email/phone) | any | 200 `Member[]` sorted by name |
| GET | `/api/members/:id` | – | any | 200 `Member` |
| POST | `/api/members` | `{ name, email, phone?, active? }` | admin | 201 `Member` |
| PATCH | `/api/members/:id` | any subset of the POST fields | admin | 200 `Member` |
| DELETE | `/api/members/:id` | – | admin | 204 |
| GET | `/api/loans` | `?status=active\|overdue\|returned&memberId=&bookId=` | any | 200 `Loan[]` newest first |
| GET | `/api/loans/:id` | – | any | 200 `Loan` |
| POST | `/api/loans` | `{ bookId, memberId, loanDays? }` (1–60, default 14) | any | 201 `Loan` |
| PATCH | `/api/loans/:id/return` | – | any | 200 `Loan` (with `fine`) |

`GET /api/members` is open to users because issuing a book needs the member list.

`status=active` means *not yet returned* (it **includes** overdue loans); `status=overdue` is only the late subset.

## Response shapes

```jsonc
// LoginResponse
{ "success": true, "role": "user", "token": "<JWT>", "expiresIn": 28800 }

// Book
{ "id": 1, "title": "Dune", "author": "Frank Herbert", "isbn": "9780441172719",
  "category": "Science Fiction", "publishedYear": 1965,
  "totalCopies": 3, "availableCopies": 2,
  "coverImageUrl": "https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg?default=false",
  "description": "…", "averageRating": 4.5, "reviewCount": 2,   // averageRating is null with no reviews
  "createdAt": "2026-10-05T11:32:00.000Z" }

// BookDetail = Book + reviews (newest first)
{ /* Book */, "reviews": [ { "id": 3, "reviewerName": "John Smith", "rating": 4,
  "comment": null, "createdAt": "..." } ] }

// Paginated<T>
{ "items": [ /* T */ ], "total": 16, "page": 1, "pageSize": 10, "totalPages": 2 }

// Member
{ "id": 1, "name": "Aarav Sharma", "email": "aarav.sharma@example.com",
  "phone": "9876543210", "active": true, "joinedAt": "2026-10-05T11:32:00.000Z" }

// Loan — book and member are always embedded; status & daysOverdue are computed
{ "id": 7, "book": { /* Book */ }, "member": { /* Member */ },
  "loanDate": "...", "dueDate": "...", "returnDate": null, "fine": 0,
  "status": "overdue", "daysOverdue": 4 }

// DashboardStats
{ "totalTitles": 16, "totalCopies": 55, "availableCopies": 46,
  "totalMembers": 8, "activeMembers": 7, "activeLoans": 9, "overdueLoans": 2,
  "recentLoans": [ /* 5 × Loan */ ],
  "topBooks": [ { "id": 2, "title": "1984", "author": "George Orwell", "loanCount": 2 } ] }
```

- Dates are **ISO-8601 UTC strings**.
- Nullable fields are returned as `null`, never omitted.
- Unversioned collections are returned as a **bare JSON array** (no envelope); paginated `/api/v1` lists use the `Paginated<T>` envelope.

## Validation

Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`:

- DTOs with `class-validator` decorators live in `backend/src/<module>/dto/`. Update DTOs are `PartialType(CreateDto)`.
- **Unknown properties are rejected** (400), not silently dropped.
- Query params are transformed to numbers where the DTO says so (`LoanQueryDto`).

## Error format

Standard NestJS exception body:

```json
{ "statusCode": 400, "message": "Member already has a copy of \"Dune\"", "error": "Bad Request" }
```

For validation failures `message` is an **array** of strings:

```json
{ "statusCode": 400, "message": ["title should not be empty", "totalCopies must not be less than 1"], "error": "Bad Request" }
```

| Status | When |
| --- | --- |
| 400 Bad Request | Validation failure (incl. unknown login role), non-numeric id, or business-rule violation (no copies, inactive member, loan limit, already returned, delete with active loans, copies below on-loan count) |
| 401 Unauthorized | Wrong login password (`"Invalid role or password"`), or a missing / invalid / expired token (`"Login required"`) |
| 403 Forbidden | Valid token but the role may not call this route (user on an admin route) |
| 404 Not Found | Unknown book / member / loan id |
| 409 Conflict | Duplicate ISBN or member email |
| 500 | Unexpected errors only |

Services throw Nest exceptions (`BadRequestException`, `NotFoundException`, `ConflictException`) with a human-readable message that the UI shows as-is.

## Auth (REQ-105)

- **Roles:** `admin` (full access) and `user` (search books, borrow, return). There are no user accounts — a visitor picks a role and enters the **static default password `1234`** (`DEFAULT_PASSWORD` in `backend/src/auth/auth.constants.ts`).
- **Login:** `POST /api/v1/auth/login` returns a signed JWT (`@nestjs/jwt`, HS256) carrying `{ role }`, valid for 8 hours.
- **Using the token:** send `Authorization: Bearer <token>` on every other request.
- **Enforcement:** a global `AuthGuard` (`APP_GUARD`) protects **every** controller route by default.
  - `@Public()` opts a route out (only the login route uses it).
  - `@Roles('admin')` restricts a route to admins; routes without it accept any valid role.
  - Serving the SPA (static files) is not guarded — the frontend shows the login screen itself.
- **Secret:** `AUTH_SECRET` env var. If unset, a random secret is generated at startup, so all sessions end when the server restarts.
- **Checklist for new endpoints:** decide the access level explicitly — add `@Roles('admin')` for anything that changes catalogue/member data; never add `@Public()` except for login-like routes.
- CORS is enabled for all origins (`app.enableCors()`); tokens are not cookies, so CORS does not expose them.
- This is a shared-password, role-only scheme for a trusted local network — not per-person accounts. Do not expose the app publicly without replacing it.

## Pagination

- `GET /api/v1/books` (REQ-108) is paginated: `?page=` (≥ 1, default 1) and `?pageSize=` (1–50, default 10), returning `Paginated<T>`. A page past the end returns `items: []` with the real `total` / `totalPages`.
- Sorting is `?sort=<field>&order=asc|desc` with a whitelisted field list (`BOOK_SORT_FIELDS`); nulls sort last and `id` is the tie-breaker so pages are stable.
- The unversioned list endpoints still return all matching rows. Dashboard `recentLoans` and `topBooks` are capped at 5.
- New paginated lists should follow the same query DTO + `Paginated<T>` shape (see `backend/src/books/dto/book-list-query.dto.ts`).

## How the frontend calls the API

- **All HTTP goes through `frontend/src/api.ts`** — components never call `fetch` directly.
- Calls use **relative URLs** (`/api/...`): same origin in production; Vite dev server proxies `/api` to `http://localhost:3000` in development.
- `request<T>()` sets `Content-Type: application/json`, parses JSON, treats an empty body (204) as `undefined`, and on non-2xx throws `ApiError(message, status)`; an array `message` is joined with `", "`.
- Response types are declared in `frontend/src/types.ts` and must be kept in sync with backend entities/DTOs by hand.
- Query strings are built with `URLSearchParams`, skipping empty/undefined values.
- `setAuthToken(token)` makes every request send `Authorization: Bearer <token>`; `AuthProvider` (`frontend/src/auth.tsx`) calls it on login, logout and when restoring a saved session.
- If an authenticated request gets **401**, the handler registered with `onUnauthorized()` runs — `AuthProvider` clears the session and shows the login screen with a "session has expired" notice.
- Pages catch errors and display `err.message` in an alert; after any successful mutation they re-fetch the list.

## Checklist for a new endpoint

1. New routes go under `/api/v1`; decide access (`@Roles('admin')` or any role); DTO with validators in `dto/`; use `ParseIntPipe` for `:id` params.
2. Business rules in the service; throw the matching Nest exception with a clear message.
3. Use `@HttpCode(204)` for deletes; POST returns 201 with the created entity.
4. Add a unit test (service, in-memory DB) and extend `test/app.e2e-spec.ts` for the HTTP contract, including 401 without a token and 403 for a role that is not allowed.
5. Add the method to `frontend/src/api.ts` and types to `frontend/src/types.ts`.
6. Update this document.

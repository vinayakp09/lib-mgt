# Database

## Engine

- **SQLite**, single local file: `database/library.sqlite` (override with `DB_PATH`). The file is git-ignored.
- Driver: `better-sqlite3` through **TypeORM 0.3** (`type: 'better-sqlite3'`).
- Foreign keys are enforced (TypeORM enables `PRAGMA foreign_keys = ON`).
- Tests use `database: ':memory:'` — a fresh DB per test module.

## Tables

### `books`

| Column | Type | Constraints / default | Notes |
| --- | --- | --- | --- |
| `id` | integer | PK, autoincrement | |
| `title` | varchar | not null | |
| `author` | varchar | not null | |
| `isbn` | varchar | not null, **unique** | 10–17 chars (validated in DTO) |
| `category` | varchar | not null, default `'General'` | free text |
| `publishedYear` | integer | nullable | 0–2100 |
| `totalCopies` | integer | not null, default 1 | 1–1000 |
| `availableCopies` | integer | not null, default 1 | invariant: `0 ≤ availableCopies ≤ totalCopies` |
| `coverImageUrl` | varchar | nullable | http(s) URL ≤ 500 chars (REQ-108) |
| `description` | text | nullable | ≤ 2000 chars (REQ-108) |
| `averageRating` | real | nullable | denormalized mean of `reviews.rating`, 1 decimal; `NULL` = no reviews (REQ-108) |
| `reviewCount` | integer | not null, default 0 | denormalized count of `reviews` (REQ-108) |
| `createdAt` | datetime | not null, set on insert | |

### `reviews` (REQ-108)

| Column | Type | Constraints / default | Notes |
| --- | --- | --- | --- |
| `id` | integer | PK, autoincrement | |
| `bookId` | integer | not null, FK → `books.id` **ON DELETE CASCADE** | |
| `reviewerName` | varchar | not null | ≤ 80 chars, trimmed |
| `rating` | integer | not null | 1–5 |
| `comment` | text | nullable | ≤ 1000 chars; blank stored as `NULL` |
| `createdAt` | datetime | not null, set on insert | |

### `members`

| Column | Type | Constraints / default | Notes |
| --- | --- | --- | --- |
| `id` | integer | PK, autoincrement | |
| `name` | varchar | not null | |
| `email` | varchar | not null, **unique** | always stored lower-case |
| `phone` | varchar | nullable | ≤ 20 chars |
| `active` | boolean | not null, default `true` | inactive members cannot borrow |
| `joinedAt` | datetime | not null, set on insert | |

### `loans`

| Column | Type | Constraints / default | Notes |
| --- | --- | --- | --- |
| `id` | integer | PK, autoincrement | |
| `bookId` | integer | not null, FK → `books.id` **ON DELETE CASCADE** | |
| `memberId` | integer | not null, FK → `members.id` **ON DELETE CASCADE** | |
| `loanDate` | datetime | not null | when issued |
| `dueDate` | datetime | not null | `loanDate + loanDays` (default 14) |
| `returnDate` | datetime | nullable | `NULL` = still on loan |
| `fine` | real | not null, default 0 | set when returned |

## Relations

```
members 1 ──< loans >── 1 books 1 ──< reviews
```

- `Review.book` is `ManyToOne` (not eager); `Book.reviews` is `OneToMany`. Deleting a book deletes its reviews.

- `Loan.book` and `Loan.member` are `ManyToOne`, **eager** — every loan query returns the full book and member objects.
- `Book.loans` / `Member.loans` are `OneToMany`, not eager.
- Loan **status is derived, not stored**: `returned` if `returnDate` set; otherwise `overdue` if at least one whole calendar day past `dueDate`; else `active` (see `backend/src/loans/loan.rules.ts`).

## Invariants (enforced in services, not DB)

1. `books.availableCopies = totalCopies − (count of loans for that book with returnDate IS NULL)`.
   - Issue: `availableCopies -= 1`; Return: `availableCopies += 1` — both in **one transaction** with the loan write.
   - Editing `totalCopies` recomputes `availableCopies`; rejected if it would go below copies on loan.
2. A member has at most **5** loans with `returnDate IS NULL`, and never two for the same book.
3. A book or member with an unreturned loan cannot be deleted. Deleting one with only returned loans cascades and removes that loan history.
4. `books.averageRating` / `reviewCount` always match the book's `reviews`; `BooksService.addReview` inserts the review and recomputes both in **one transaction** (`summarizeRatings` in `backend/src/books/review.rules.ts`). They are stored so the list can sort by rating.

## Schema management / migration tool

- **No migrations currently.** TypeORM `synchronize: true` creates/alters tables from the entity classes on startup (`backend/src/app.module.ts`).
- This is acceptable for a local, single-user SQLite app, but `synchronize` can **drop columns/data** when an entity property is renamed or removed.

### Rules for schema changes

- **Additive changes only** with `synchronize` (new nullable column or column with a default, new table). 
- **No destructive change without backfill:** to rename/remove a column or tighten a constraint, first add the new column, backfill data, switch code to it, and only later remove the old one — or switch to migrations first.
- Before any non-additive change, back up `database/library.sqlite` (it is a single file — copy it).
- If moving beyond local use: set `synchronize: false`, generate migrations with the TypeORM CLI (`typeorm migration:generate`) into `backend/src/database/migrations/`, and run them on startup (`migrationsRun: true`).
- REQ-108 was additive only (four new `books` columns — nullable or defaulted — and the new `reviews` table), so `synchronize` upgrades an existing `library.sqlite` in place without data loss. Existing books keep `NULL` cover/description and `0` reviews until edited or re-seeded.
- Every new entity must be added to the `entities` array exported from `app.module.ts` (used by both the app and tests).
- Dates are stored by TypeORM as UTC datetime strings and hydrated back to JS `Date`.

## Seed / sample data

- Source: `backend/src/database/sample-data.ts` — 16 books (each with an Open Library cover URL and a description), 16 reviews across several books, 8 members (1 inactive), 12 loans (some active, 2 overdue, 3 returned incl. one late with a fine). Loan and review dates are relative to "now", so overdue examples stay overdue.
- `SeedService.seed()` runs automatically on app start **only if `books` is empty** (`AUTO_SEED=false` disables).
- `npm run seed` → `seed({ reset: true })`: clears `loans`, `reviews`, `books`, `members`, resets autoincrement counters (`sqlite_sequence`), and reloads the sample data. **Destroys all existing data.**

## Inspecting the data

Any SQLite client works (DB Browser for SQLite, VS Code SQLite extension, `sqlite3 database/library.sqlite`). Example:

```sql
SELECT b.title, m.name, l.dueDate
FROM loans l JOIN books b ON b.id = l.bookId JOIN members m ON m.id = l.memberId
WHERE l.returnDate IS NULL AND date(l.dueDate) < date('now');
```

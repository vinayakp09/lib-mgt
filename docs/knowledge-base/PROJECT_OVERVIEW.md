# Project Overview

## What the product does

**Library Management System (LMS)** is a web app for a small library to manage its book catalogue, its members, and the lending of books (issue, return, overdue tracking, late fines). It is a single monolithic repo: React frontend + NestJS backend + local SQLite database, served from one port.

## Who uses it

Everyone signs in on the login screen by choosing a **role** and entering the static default password **`1234`** (REQ-105). There are no individual accounts.

| Role | What they can do |
| --- | --- |
| **Admin** | Full access: dashboard, manage books (add / edit / delete), manage members, issue and return books |
| **User** | Dashboard, search the catalogue (read-only), issue (borrow) and return books. No Members page, no book editing |

The app is meant for a trusted staff machine / local network; there is still no member-facing portal.

## Main flows

0. **Log in** – any page shows the login screen until the visitor picks *User* or *Admin* and enters `1234`. The session is remembered in the browser for 8 hours; *Log out* is in the sidebar.
1. **Dashboard** (`/`) – see totals (titles, copies, available copies, members, books on loan, overdue), the 5 most recent loans and the top 5 most-borrowed books.
2. **Browse & manage books** (`/books`) – a split view: the left list can be searched (title / author / ISBN / category), filtered by category and availability, sorted (title, author, year, rating, recently added) and paged; the right pane shows the selected book's cover, rating, description and reviews. Anyone can post a review (name, 1–5 stars, optional comment); admins also add, edit and delete books inline. Each book tracks `totalCopies` and `availableCopies`.
3. **Manage members** (`/members`, admin only) – search (name / email / phone), register, edit, activate/deactivate, delete.
4. **Issue a book** (`/loans`) – choose an *active* member and a book with an available copy, optionally change loan length (default 14 days). Availability drops by one.
5. **Return a book** (`/loans`) – click *Return*; the fine is calculated if late and availability increases by one.
6. **Track loans** (`/loans`) – filter tabs: All / On loan / Overdue / Returned.

## Business rules

| Rule | Value / behaviour | Where |
| --- | --- | --- |
| Default loan period | 14 days (1–60 allowed per loan) | `backend/src/loans/loan.rules.ts` |
| Max active loans per member | 5 | `loan.rules.ts` |
| Same title twice | A member cannot hold two copies of the same book at once | `loans.service.ts` |
| Inactive members | Cannot borrow | `loans.service.ts` |
| Availability | Can only issue if `availableCopies > 0` | `loans.service.ts` |
| Overdue | A loan is due until the **end of its due day**; overdue = 1+ whole calendar days past due date, not returned | `loan.rules.ts` |
| Fine | 10 (currency-agnostic units) per overdue calendar day, fixed at return time | `loan.rules.ts` |
| Delete book / member | Blocked while they have unreturned loans; past (returned) loans are deleted with them | `books.service.ts`, `members.service.ts` |
| Reduce total copies | Cannot go below the number currently on loan | `books.service.ts` |
| ISBN | Unique, 10–17 chars | DTO + DB unique index |
| Member email | Unique, stored lower-case | `members.service.ts` |
| Reviews | Rating is a whole number 1–5; the book's average (1 decimal) and count update when a review is posted; reviews are deleted with their book | `books.service.ts`, `review.rules.ts` |
| Cover image | Optional http(s) URL; a placeholder is shown if missing or broken | DTO, `BookCover.tsx` |

## Glossary

| Term | Meaning |
| --- | --- |
| **Book / Title** | A catalogue entry identified by ISBN. One book row can have many physical copies. |
| **Copy** | A physical item of a book. Tracked only as counts: `totalCopies`, `availableCopies`. |
| **Member** | A registered library patron who can borrow books. `active=false` means suspended. |
| **Role** | Who is signed in: `admin` (full access) or `user` (search, borrow, return). Not a person — anyone with the password can pick either role. |
| **Session / token** | The signed JWT returned by login and stored in the browser; sent as `Authorization: Bearer …`, expires after 8 h. |
| **Loan** | One copy of one book lent to one member. Has `loanDate`, `dueDate`, optional `returnDate`, `fine`. |
| **Issue / Borrow** | Creating a loan (`POST /api/loans`). |
| **Return** | Closing a loan (`PATCH /api/loans/:id/return`). |
| **Loan status** | Derived, not stored: `active` (out, not late), `overdue` (out, past due day), `returned`. |
| **Days overdue** | Whole calendar days between due date and now (or the return date). |
| **Fine** | `daysOverdue × 10`, stored on the loan when it is returned. |
| **On loan / outstanding** | Loans with no `returnDate` (includes overdue). |
| **Review / rating** | A reader's 1–5 star rating with an optional comment on a book; the book shows the average and count. |
| **Seed / sample data** | 16 books (with covers, descriptions), 16 reviews, 8 members, 12 loans loaded by `npm run seed` or automatically on first start. |

## Tech summary

React 18 + Vite + TypeScript · NestJS 10 + TypeORM 0.3 · SQLite via `better-sqlite3` · Jest / Supertest (backend) · Vitest + Testing Library (frontend). See [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), [API_CONVENTIONS.md](./API_CONVENTIONS.md).

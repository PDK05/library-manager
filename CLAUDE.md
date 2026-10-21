# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The project was repurposed from a GPA tracker to a **library management app** (the directory name `gpa-tracker` is historical). The old GPA spec and flows are kept for reference in `archive/gpa-tracker/` — don't build from them. Stage 3 (implementation) has started: Vite is scaffolded, git is initialised on `main` (no remote yet), and the database is live in Supabase. `PRD.md` §4 tracks feature status (F1–F7) — update the checkboxes there as features land. Build in dependency order from that table: F1 → F2, F3 → F4 → F5 → F6; F7 needs F2, F4, F6.

## Development process (Waterfall)

Work proceeds stage by stage; finish and get user sign-off on a stage before starting the next.

1. **Requirements** — done: `PRD.md`.
2. **Design**
   - Business flows go in `design/flows/`, one Mermaid file per flow, indexed in `design/flows/README.md` together with the design decisions the PRD leaves open. Each flow must include its edge cases (invalid input, empty list, concurrent edits, cancelled confirmation, etc.), not just the happy path.
   - `design/ERD.md`: Mermaid `erDiagram` derived from `PRD.md` and the flows.
   - Once the ERD is approved, create the database with the Supabase MCP.
3. **Implementation** — one feature at a time, in the F1–F7 dependency order:
   - Create a git branch per feature (`/git-branch`).
   - Test before merging: Vitest unit tests, API tests in Postman via the Postman MCP, and e2e tests with Playwright via the Playwright MCP. The Playwright MCP is configured in `.mcp.json` (loads after a Claude Code restart); the Postman MCP is not installed yet and needs a Postman API key.
   - After tests pass and the user approves, merge into `main` (`/merge`) and tick the feature in `PRD.md` §4.
4. **Deployment** — deploy to Vercel via the Vercel MCP (not installed yet).

## What we're building

A library management web app with two roles. **Thủ thư** (librarian) manages books, readers, loans, returns and overdue fines; **độc giả** (reader) searches the catalogue and sees their own loans and fines. Email/password login via Supabase Auth; librarian accounts are created directly in Supabase, readers self-register only with an email a librarian has already recorded. RLS enforces the roles. No offline mode and no `localStorage` cache of business data. All UI text and validation messages are in Vietnamese.

## Stack and commands (per PRD §3)

- Vite + plain HTML/CSS/JavaScript (no framework), unit tests with Vitest, deploy to Vercel.
- Scripts: `npm run dev`, `npm run build`, `npm test` (Vitest, runs `src/**/*.test.js` in Node). Run a single test file with `npx vitest run path/to/file.test.js`, or a single test by name with `npx vitest run -t "test name"`.
- Supabase URL and publishable key come from `.env.local` (gitignored; template in `.env.example`).

## Domain rules that must be implemented exactly

These live in `PRD.md` (business parameters in §1.4) and `design/flows/` — keep validation and date/fine calculations as pure functions separate from DOM code so Vitest can cover them without a browser:

- **Loan rules (F4):** loan period 14 days; max 5 books on loan per reader; one copy per loan; a reader can't borrow while their card is locked or expired, while holding an overdue book, or while owing an unpaid fine, and can't hold two copies of the same title. Collect *all* failing reasons, not just the first.
- **Fines (F5/F6):** 5.000 đ per day late per book; days late = return date − due date in calendar days (Asia/Ho_Chi_Minh), so returning on the due date is not late. A fine is created only on return; overdue lists show a projected fine.
- **Concurrency:** borrow, return, pay-fine and delete-reader run as Postgres RPCs in one transaction with row locks, so the database is the final authority (e.g. two librarians lending the last copy). "Today" comes from the server clock, not the browser.
- **Deletes** are soft (`da_xoa`), need confirmation, and are blocked while a book has copies on loan or a reader has loans or unpaid fines. ISBN and reader email are unique only among non-deleted rows.
- **Validation:** see `PRD.md` F2/F3 and the sub-flows in `design/flows/02-…` and `03-…`. Errors render under the corresponding input; a failed Supabase write keeps the form input.
- Responsive down to 360px width.

## Repo conventions

- `.claude/commands/` holds project slash commands for git workflow (`/git-branch`, `/commit`, `/merge`, `/push`, `/pull`) and session hygiene. `/learn-by-mistake` records errors in `common_errors.md`; `/wrap-up` updates the "Project structure" section below. Don't run `/new-project` — git is already initialised.
- `.mcp.json` enables the Supabase MCP (database work) and the Playwright MCP (e2e tests). Email/password auth must be enabled in the Supabase project, plus the `unaccent` extension for accent-insensitive search.

## Project structure

- `PRD.md` — product requirements and feature status table
- `design/flows/` — business flows (Mermaid) with edge cases; `README.md` indexes them
- `design/ERD.md` — Mermaid ERD, DB constraints, views, RPCs and RLS matrix
- `supabase/migrations/` — SQL already applied to Supabase project `library-manager` (ref `nucyieutqjswplhukryd`, ap-southeast-1); add new migrations here and apply them with the Supabase MCP
- `archive/gpa-tracker/` — superseded GPA tracker spec and flows, reference only
- `.claude/commands/` — project slash commands

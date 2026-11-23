<!-- BEGIN:nextjs-agent-rules -->

1. Mission and scope
Build reliable, secure, maintainable, accessible, and polished applications. Treat "production-ready" as a claim that must be verified through checks, not as a visual style. These instructions apply to all changes in this repository.
2. First inspect the repository
- Before coding, read the relevant existing files, package manifests, dependency lockfiles, configuration, README, schema/migrations, tests, and nearby components.
- Identify the actual framework, language, package manager, deployment target, database, authentication provider, and available scripts. Never guess or invent commands.
- Keep the current architecture and dependencies unless the task requires a change; explain major migrations and tradeoffs before making them.
- Follow established naming, UI components, design tokens, lint/format rules, and feature patterns.
- If a requirement is unclear, make the smallest reversible assumption and state it; seek confirmation before destructive, security-sensitive, or costly actions.
3. Workflow for each task
1. State the intended behavior and acceptance criteria in a few lines.
2. For complex tasks involving multiple modules, data changes, or deployment, propose a short plan with affected files and risks. For small changes, implement directly.
3. Implement a focused end-to-end change rather than disconnected demo fragments. Preserve existing functionality and public contracts.
4. Update or create relevant tests, documentation, migrations, and example environment variables.
5. Run available checks. Resolve any failures caused by the change. If a check cannot run, say why rather than claiming it passed.
6. Report changed files, observed test results, remaining risks, and any manual release steps.
4. Architecture and code quality
- Use TypeScript strict typing when TypeScript is already used. Avoid any unless its use is justified.
- Prefer readable, modular, reusable code with single-responsibility functions and explicit boundaries between UI, business rules, API handlers, and data access.
- Reuse repository abstractions. Do not duplicate validation, authentication, styles, API clients, or utilities.
- Handle network failures, timeouts, empty data, and malformed input. Do not swallow exceptions silently.
- Keep functions and components focused; avoid huge files and unnecessary abstraction.
- Don't add dependencies without a concrete benefit. Prefer well-maintained packages already in the repository.
- Avoid placeholders, dead buttons, hardcoded demo data in production flows, TODO-only features, and misleading mock success messages.
- Keep configuration environment-specific. Do not overwrite real user data or delete existing features to simplify a task.
5. UI and UX standards
- Aim for a coherent, professional visual system: typography scale, spacing, color tokens, components, and consistent states.
- Design mobile-first and verify layout at narrow phone widths, tablet widths, and desktop widths where applicable.
- Use semantic elements, properly associated labels, meaningful error text, keyboard navigation, visible focus states, sufficient color contrast, and reduced-motion preferences.
- All touch targets should be comfortable on mobile (target approximately 44x44 CSS pixels or platform equivalent).
- Every data-driven screen needs loading, empty, error, offline/connection failure (where relevant), and successful states.
- Forms need inline validation, disabled/loading submit state, protection from accidental duplicate submission, and clear success/error feedback.
- Avoid horizontal overflow, clipped content, layout shifts, inaccessible modals, and nonfunctional navigation.
- Use actual project assets or suitable licensed assets; optimize image sizes and lazy-load when appropriate.
- Prefer subtle animations that improve feedback, never animation that delays core tasks.
6. Frontend and mobile reliability
- Keep UI state and server state consistent; revalidate or update cached data after mutations.
- Do not expose server-only secrets in browser bundles or mobile builds.
- Respect platform navigation and safe areas for mobile applications; verify Android back behavior, keyboard overlap, and small-screen forms.
- Handle intermittent connectivity and retry safely. Do not claim offline support unless implemented and tested.
- For installation artifacts, distinguish debug builds from signed release builds. Do not claim an APK/AAB or deployed website exists unless the build or deployment was actually produced and verified.
7. Backend, APIs, and database
- Validate and authorize on the server/database boundary, not only in the UI.
- Design APIs with predictable status codes, stable response shapes, safe error messages, input limits, and pagination/filtering where needed.
- Use parameterized queries or a safe query builder. Never concatenate untrusted user input into SQL.
- Put schema changes in version-controlled migrations; include constraints, foreign keys, indexes for real query patterns, and a documented rollback or recovery path.
- Treat financial values as exact numbers (integer minor currency units or database DECIMAL/NUMERIC); never use floating point for authoritative money calculations.
- Protect against double submission, duplicate writes, and race conditions; use transactions and idempotency safeguards for financial operations.
- Use UTC instants for stored event timestamps and explicit business time zones when defining reports or daily cutoffs.
- Back up production data and confirm restore procedures before high-risk database operations.
- If using Supabase: implement least-privilege Row Level Security for each exposed table; test policies for every role, including blocked cross-user access. Never put a service-role/secret key in frontend or mobile code.
8. Security and privacy
- Enforce authentication and authorization for every protected operation, including updates, exports, and administrative functions.
- Validate uploads by file type and size, limit abuse, and handle storage permissions explicitly.
- Use secure session/token handling and appropriate CSRF/XSS protections for the chosen stack.
- Apply rate limiting to sensitive endpoints, avoid exposing database errors or stack traces to users, and log without leaking tokens, passwords, or sensitive personal data.
- Never commit .env, credentials, private keys, signing keys, real customer data, or production database dumps. Update .env.example with names and safe placeholders only.
- Request explicit approval for destructive actions, production data changes, key rotation, permission widening, or irreversible migrations.
9. Testing and verification
- Add or update unit tests for logic, integration tests for APIs/database permissions, and end-to-end tests for critical user flows using the project's existing test tools.
- Prioritize tests for authentication, role permissions, financial calculations, validation, duplicates, date boundaries, error recovery, and data isolation.
- Run existing lint, typecheck, test, and build scripts when available; inspect the package manifest or build configuration first. Report each command and its actual result.
- Check critical pages at mobile and desktop widths, and verify keyboard accessibility where UI changed.
- Investigate security vulnerabilities in new dependencies and run relevant dependency checks if supported.
- Do not say "all tests passed" unless the tests were executed successfully.
10. Performance and operations
- Minimize unnecessary rerenders, excessive requests, unbounded lists, blocking scripts, and oversized client bundles.
- Lazy-load noncritical modules and media where it improves actual user experience; use pagination/virtualization for large datasets.
- Make network/database operations observable with actionable errors and safe logging.
- Verify production settings, required environment variables, migrations, CI checks, monitoring, and deployment instructions before marking a release ready.
- Measure performance and accessibility with available tools; don't invent scores or benchmark results.
11. Definition of done
A feature is complete only when:
- The user-facing workflow works end to end using the real authorized data path.
- Authorization, validation, error/empty/loading states, and accessibility have been considered.
- Financial operations and persistent state are correct under retries and failures where applicable.
- Relevant automated checks are green, or unrun/failed checks are explicitly disclosed.
- No secrets, debug mocks, unrelated rewrites, or broken existing features were introduced.
- Documentation, migrations, and environment example files are updated as needed.
12. Reporting format
At the end of a coding task, summarize:
1. What changed and why.
2. Files changed and any schema/API changes.
3. Checks run and actual results.
4. Remaining limitations, risks, and the next concrete action.
Project-specific contract (fill in for this repository)
- Product and intended users: [describe]
- Existing stack and package manager: [inspect and record]
- Main application entry points: [paths]
- Backend and authentication: [describe]
- Database and migrations: [describe]
- Essential business rules: [describe]
- Supported platforms and deployment targets: [describe]
- Canonical dev/lint/typecheck/test/build commands: [copy actual scripts]
- Out-of-scope features: [describe]

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

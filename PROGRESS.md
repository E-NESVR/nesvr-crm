# NESVR CRM — Build Progress

## Phase 1: Project Scaffold + Database + Auth + CSV Import ✅
- Initialized Node.js project with all dependencies
- Express server with session middleware (`express-session` + `connect-sqlite3`)
- SQLite schema: `leads`, `research_reports`, `call_logs`, `activities`, `email_drafts`, `dashboard_cache`
- CSV auto-import on startup: **640 leads imported** from `data/leads.csv`
- Lead score calculation (data completeness formula, 0-100)
- Auth routes: login, logout, me — hardcoded users (errol, nick, shane)
- `requireAuth` middleware protecting all `/api/*` except `/api/auth/*`

## Phase 2: Backend API ✅
- `GET/POST /api/leads` with pagination, search (name/phone/cat), tier/category/status/quality filters
- `GET/PUT/DELETE /api/leads/:id`
- `GET /api/leads/categories` — distinct category list for filter dropdowns
- `GET /api/leads/export` — CSV export of filtered view
- `GET/POST /api/leads/:id/calls` — call log with auto activity creation
- `GET/POST /api/leads/:id/activities`
- `GET /api/leads/:id/report`
- `GET /api/dashboard/metrics` — all stat cards + chart data
- `GET /api/activities/recent`
- `GET /api/communications/followups`
- Research queue: `POST /api/research/queue`, `GET /api/research/queue/status`, SSE stream
- Single research: `POST /api/research/leads/:id/research`
- Email generation: `POST /api/research/leads/:id/emails/generate`
- Email templates: `GET /api/research/templates`

## Phase 3: Frontend Scaffold + Auth + Leads List ✅
- Vite + Vue 3 build setup with dev proxy to backend
- CSS custom properties theming (dark/light/auto, saved to localStorage)
- Vue Router with auth guard (redirects to /login if not authenticated)
- Reactive global store (user, theme, toasts, sidebar state)
- App shell: collapsible sidebar + topbar with search
- Login page with branded design
- Leads list: search, filter bar (tier/category/status/quality), sortable table, pagination
- Bulk research queue selection with live progress
- Export to CSV

## Phase 4: Lead Profile Page ✅
- Two-column layout (company info left, interactions right)
- Company info card: phone/email/website links, address, tier badge, category tag
- Research Intelligence card: readiness score bar, summary, findings, approach, "Run Research" button
- Lead Info section: inline status/type dropdowns with auto-save
- Call Intel: per-user filter, call log list, "Log a Call" modal with full form
- Activity Timeline: chronological entries with type icons
- Log Activity modal

## Phase 5: AI Research Engine ✅
- Google Custom Search API enrichment (2 queries per lead)
- Claude Haiku research report generation with structured JSON output
- Fallback reports when API key not configured
- Research report save to DB with all extracted fields
- Auto-status update (new → researched) after research complete
- Auto-activity creation on research completion
- Bulk queue with in-memory state + polling endpoint + SSE stream
- 2 second delay between queue items (rate limit protection)

## Phase 6: Dashboard + Charts ✅
- 4 stat cards: total leads, contacted, demos booked, closed won
- Industry distribution donut chart (Chart.js)
- Pipeline by stage horizontal bar chart
- Monthly activity line chart (last 6 months)
- Recent activity feed (last 15 entries)
- "At a Glance" sidebar with avg score, top categories

## Phase 7: Communications Page ✅
- 3-column layout: email composer, activity feed, follow-ups
- 4 built-in email templates with merge tag support
- Lead search/select with dropdown suggestions
- Merge tag insertion (click to insert at cursor)
- AI email generation via Claude Haiku
- Copy to clipboard
- Open in email client (mailto: link)
- Upcoming follow-ups panel from call_logs

## Phase 8: Polish ✅
- Toast notification system (success/error/warning/info with auto-dismiss)
- Loading skeletons on leads table
- Spinner on async operations (research, call log, email gen)
- Empty states on all list views
- Escape key closes all modals (via keydown.escape.window)
- Mobile responsive (breakpoints at 768px, 900px, 1100px, 1200px)
- Settings page: theme switcher, API key status, team members, DB stats
- CLAUDE.md and README.md written

## Pending
- GitHub repo push (requires gh CLI setup)

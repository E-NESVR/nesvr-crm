# NESVR CRM — Implementation Plan

## Tech Stack Decisions

### Frontend: Vue 3 + Vite
**Justification:** Vue 3 offers reactive component model, single-file components (`.vue`), and excellent TypeScript-free DX. Lighter runtime than React, more structured than vanilla JS, and Vite gives instant HMR and fast builds. The Options API / Composition API split lets us keep components readable without boilerplate. No JSX.

### Backend: Express.js (Node.js)
**Justification:** Simple, well-understood, excellent middleware ecosystem. RESTful routes map cleanly to the API spec. SSE support is native.

### Database: SQLite via `better-sqlite3`
**Justification:** Synchronous API simplifies Express route handlers (no async/await pyramid). Zero config. Single file. Sufficient for 3 users + 640–10,000 leads.

### Auth: `express-session` + `connect-sqlite3`
**Justification:** Simple cookie-based sessions. Sessions stored in SQLite alongside the app DB for persistence across restarts. No JWT complexity.

### Styling: CSS Custom Properties + hand-written CSS
**Justification:** Full control over the design. No utility class bloat. Theming via `[data-theme]` attribute on `<html>`. Consistent with Linear-style aesthetic.

### Charts: Chart.js
**Justification:** Lightweight, Vue-compatible via `vue-chartjs`, handles all required chart types (line, donut, bar).

### HTTP Client: `axios` (frontend)
**Justification:** Cleaner interceptors for auth error handling than native fetch.

---

## File Structure

```
nesvr-crm/
├── server/
│   ├── index.js              — Express app entry point, static serving
│   ├── db.js                 — SQLite init, schema creation, CSV import
│   ├── auth.js               — Session middleware, requireAuth
│   └── routes/
│       ├── auth.js           — Login / logout / me
│       ├── leads.js          — CRUD + pagination + filters
│       ├── research.js       — AI research engine, bulk queue, SSE
│       ├── activities.js     — Activity log CRUD
│       ├── communications.js — Email drafts, follow-ups
│       └── dashboard.js      — Metrics aggregation
│   └── services/
│       ├── research.js       — Research orchestration (search → AI → save)
│       ├── enrichment.js     — Google Custom Search API
│       └── emailGen.js       — Claude email generation
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.js
│       ├── router.js
│       ├── store.js          — Simple reactive store (no Vuex/Pinia — too heavy)
│       ├── api.js            — Axios instance + all API calls
│       ├── styles/
│       │   ├── global.css    — Reset, typography, layout
│       │   └── theme.css     — CSS custom properties (dark + light)
│       ├── pages/
│       │   ├── Login.vue
│       │   ├── Dashboard.vue
│       │   ├── Leads.vue
│       │   ├── LeadProfile.vue
│       │   ├── ResearchReport.vue
│       │   ├── Communications.vue
│       │   └── Settings.vue
│       └── components/
│           ├── AppLayout.vue     — Shell with sidebar + topbar
│           ├── Sidebar.vue
│           ├── TopBar.vue
│           ├── LeadTable.vue
│           ├── StatCard.vue
│           ├── Modal.vue
│           ├── CallLogForm.vue
│           ├── ActivityTimeline.vue
│           ├── ResearchCard.vue
│           ├── EmailComposer.vue
│           ├── ThemeToggle.vue
│           ├── Toast.vue
│           └── PriorityBadge.vue
├── data/
│   └── leads.csv             — Renamed from original CSV
├── .env
├── .env.example
├── package.json
├── CLAUDE.md
├── PLAN.md
├── PROGRESS.md
└── README.md
```

---

## Phase Order

### Phase 1: Project Scaffold + Database + Auth + CSV Import
- Initialize Node.js project with all dependencies
- Set up Express server with session middleware
- Create SQLite schema (all 6 tables)
- CSV import logic (auto-run on empty leads table)
- Auth routes + middleware
- Serve static client build
- Basic health check endpoint

### Phase 2: Backend API — Leads CRUD + Activities + Calls
- GET /api/leads (with pagination, search, filters)
- POST/GET/PUT/DELETE /api/leads/:id
- GET/POST /api/leads/:id/calls
- GET/POST /api/leads/:id/activities
- GET /api/dashboard/metrics
- GET /api/activities/recent

### Phase 3: Frontend Scaffold + Auth + Leads List
- Vite + Vue 3 setup
- Router configuration (all routes)
- Theme system (CSS custom properties, dark/light toggle)
- AppLayout component (sidebar + topbar)
- Login page
- Leads list page with search, filters, pagination, table

### Phase 4: Lead Profile Page
- Two-column layout
- Company Info Card
- Call Intel section + Log a Call modal
- Activity Timeline + Log Activity modal
- Research Card (empty state + data state)
- Lead Info section (inline editing)

### Phase 5: AI Research Engine
- Backend research service (Google Search + Claude AI)
- Single lead research endpoint
- Bulk research queue with SSE progress
- Research report display (full page + formatted)
- Re-run research functionality

### Phase 6: Dashboard + Charts
- Stat cards with live DB counts
- Chart.js integration (line, donut, bar)
- Industry distribution chart
- Pipeline by stage chart
- Recent activity feed

### Phase 7: Communications Page
- Email composer with templates
- Merge tag substitution
- AI email generation (Claude Haiku)
- Activity feed panel
- Follow-ups panel

### Phase 8: Polish + Settings
- Toast notification system
- Loading/skeleton states on all async operations
- Empty states on all list views
- Mobile responsive (hamburger sidebar under 768px)
- Escape key closes all modals
- Form validation with error messages
- Settings page (theme override, API key status)
- README.md

---

## Key Conventions
- All DB access through `server/db.js` module
- `requireAuth` middleware on all `/api/*` except `/api/auth/*`
- Lead score recalculated on every save (helper function)
- Research reports stored as JSON in SQLite — never re-fetched unless re-run
- Activity entries auto-created by: call log saves, research completion, status changes
- Timestamps: ISO strings in SQLite
- API keys missing → features disabled gracefully, no crashes
- Frontend API calls all go through `src/api.js` (axios instance)
- Vite dev proxy: `/api` → `http://localhost:3000` during development

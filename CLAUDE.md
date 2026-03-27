# NESVR CRM

## What this is
Internal sales CRM for NESVR (AI phone receptionist reseller). 3 users: Errol, Nick, Shane.
Tracks 640+ leads across 18 Jacksonville business categories (HVAC, Law Firms, Contractors, etc.)

## Stack
- **Frontend:** Vue 3 + Vite — compiled to `/dist/`, served by Express
- **Backend:** Node.js + Express
- **Database:** SQLite via `better-sqlite3` at `./nesvr.db`
- **Auth:** `express-session` with SQLite session store
- **Charts:** Chart.js via `chart.js/auto`
- **AI:** Anthropic Claude Haiku via `@anthropic-ai/sdk`
- **Search Enrichment:** Google Custom Search API

## Run locally
```bash
npm install
npm run build        # Build Vue frontend
npm start            # Start production server at http://localhost:3000
```

For development (hot reload):
```bash
npm run dev          # Starts Express + Vite dev server concurrently
# Backend: http://localhost:3000
# Frontend: http://localhost:5173 (proxied to backend)
```

## Login credentials
- errol / password
- nick / password
- shane / password

## Key conventions
- All DB access through `server/db.js` — never import `better-sqlite3` directly in routes
- `requireAuth` middleware applied to all `/api/*` except `/api/auth/*`
- Lead score recalculated on every lead update via `calculateLeadScore()` in `db.js`
- Research reports stored as JSON in SQLite (`content_json` column) — never re-fetched from AI unless explicitly re-run
- Activity entries auto-created by: call log saves, research completion, status changes
- All timestamps stored as ISO strings in SQLite
- Frontend API calls all go through `client/src/api.js` (axios instance)
- Vite dev proxy: `/api` → `http://localhost:3000`

## Environment
Copy `.env.example` to `.env` and fill in API keys:
- `ANTHROPIC_API_KEY` — for AI research reports and email generation
- `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` — for lead enrichment

App degrades gracefully if API keys missing (fallback reports generated).

## Database
SQLite at `./nesvr.db`. Auto-created on first run. Leads auto-imported from `data/leads.csv` if table is empty.
Sessions stored in `./sessions.db`.

## File structure
```
server/
  index.js          — Express entry point
  db.js             — Schema, CSV import, score calculation
  auth.js           — User list, requireAuth middleware
  routes/           — Express routers
  services/         — Research engine, email gen, enrichment
client/src/
  pages/            — Vue page components
  components/       — Reusable Vue components
  styles/           — CSS custom properties (theme.css, global.css)
  api.js            — Axios instance + all API methods
  store.js          — Reactive global state (user, theme, toasts)
  router.js         — Vue Router config
dist/               — Built frontend (git-ignored in dev)
data/leads.csv      — Source CSV (640 leads)
```

## Deployment
The app runs identically on localhost or Railway.app — no code changes needed.
For Railway: set the env vars as Railway environment variables. The `PORT` env var is auto-set.
For Raspberry Pi with Cloudflare Tunnel: run `npm start` and point the tunnel to port 3000.

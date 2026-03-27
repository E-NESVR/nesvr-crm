# NESVR CRM

Internal sales CRM for the NESVR team. Tracks 640+ Jacksonville business leads, manages outreach, generates AI research reports, and coordinates sales activity across the 3-person team.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and add API keys (optional but recommended)
cp .env.example .env

# 3. Build frontend
npm run build

# 4. Start server
npm start

# Open http://localhost:3000
```

**Login:** `errol` / `password` (or `nick` / `password`, `shane` / `password`)

## Development Mode

```bash
npm run dev
# Backend:  http://localhost:3000
# Frontend: http://localhost:5173
```

## Features

- **640 leads** imported from CSV, categorized across 18 Jacksonville business verticals
- **Lead scoring** based on data completeness (0-100)
- **AI research reports** — Google Search enrichment + Claude analysis per lead
- **Bulk research queue** — process multiple leads with live progress updates
- **Call logging** with outcomes, follow-up scheduling, notes
- **Activity timeline** on every lead
- **Email composer** with templates, merge tags, and AI generation
- **Dashboard** with live charts: industry distribution, pipeline by stage, monthly activity
- **Dark/Light/Auto theme** with system detection + manual toggle
- **Mobile responsive** sidebar

## API Keys (Optional)

Configure in `.env`:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | AI research reports + email generation |
| `GOOGLE_SEARCH_API_KEY` | Lead enrichment via Google Custom Search |
| `GOOGLE_SEARCH_ENGINE_ID` | Paired with above (get from Google Cloud Console) |

The app works without API keys — research reports use category-based fallback templates.

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`)
- **Frontend:** Vue 3 + Vite
- **Charts:** Chart.js
- **Auth:** express-session (cookie-based, 7-day sessions)
- **AI:** Anthropic Claude Haiku

## Deployment

Works on localhost, Railway.app, or Raspberry Pi + Cloudflare Tunnel with zero code changes.

For Railway: `npm run build && npm start` as the start command. Set env vars in Railway dashboard.

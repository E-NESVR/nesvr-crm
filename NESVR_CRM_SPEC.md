# NESVR CRM — Full Build Specification for Claude Code

## READ THIS FIRST — HOW TO EXECUTE THIS SPEC

This is a complete, unambiguous specification for a production-quality CRM application. Before writing a single line of code:

1. Read this entire document top to bottom
2. Write a `PLAN.md` file outlining your exact implementation approach, tech stack choices with justification, file structure, and phase order
3. Wait — do not proceed until the plan is written
4. Execute phase by phase, completing and testing each phase before moving to the next
5. After each phase, write what was completed to `PROGRESS.md`
6. If you are ever uncertain about anything, refer back to this spec — do not guess or improvise

---

## PROJECT OVERVIEW

**Product:** NESVR CRM — an internal sales CRM for a 3-person AI phone receptionist reseller company called NESVR.

**What NESVR sells:** AI-powered phone receptionist services to local Jacksonville, FL businesses (HVAC, law firms, contractors, medical offices, etc.). The CRM tracks leads, manages outreach, stores AI-generated research reports on each business, and helps the team coordinate sales activity.

**Who uses it:** 3 people — Errol, Nick, Shane. All 3 need simultaneous access from different devices.

**How it runs:** Node.js backend + SQLite database, runs locally on a PC or Raspberry Pi. Frontend served by the same Node server. Accessible via browser at `http://localhost:3000` for MVP. Designed so it can later be deployed to Railway.app or a Raspberry Pi with a Cloudflare Tunnel with zero code changes.

**Design mandate:** This must look like a $300k/year designer built it. Dark/light mode with auto system detection + manual toggle. Brand colors: deep navy blue, white, silver/slate. Clean, modern, data-dense but not cluttered. Think Linear.app meets a sales CRM. NOT generic Bootstrap or Material UI slop. Pick distinctive typography. Every spacing decision should be intentional.

---

## TECH STACK — CLAUDE CHOOSES, BUT JUSTIFY IN PLAN.md

Pick the best stack for this use case. Consider:
- **Frontend:** Vue.js, Svelte, or vanilla HTML/CSS/JS with a build tool. Do NOT use React unless you have a strong specific reason. The UI should be fast, clean, and maintainable.
- **Backend:** Node.js with Express. Keep it simple and RESTful.
- **Database:** SQLite via `better-sqlite3`. Zero config, runs anywhere, sufficient for 3 users and 640-10,000 leads.
- **Auth:** Simple session-based auth with `express-session`. No JWT, no OAuth.
- **Styling:** CSS custom properties for theming. A utility-first approach is fine but not required.
- **Build:** Vite if using a frontend framework.

Whatever you choose — **justify it in PLAN.md** and commit to it. Do not mix frameworks.

---

## AUTHENTICATION

Three hardcoded users. No registration flow. No admin panel.

```
Username: errol    Password: password
Username: nick     Password: password  
Username: shane    Password: password
```

- Session-based login. Sessions persist for 7 days.
- If not logged in, redirect to `/login`
- Login page: NESVR logo/wordmark, username + password fields, login button. Clean, branded.
- Logout button accessible from anywhere in the nav.
- Each logged-in user has a `currentUser` context available app-wide (used for call logging attribution).

---

## DATABASE SCHEMA

Use SQLite with `better-sqlite3`. Create all tables on first run via an `initDB()` function.

### `leads` table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
business_name TEXT NOT NULL,
category TEXT,
priority_tier TEXT,         -- "Tier 1 - High Priority", "Tier 2 - Medium Priority", "Tier 3 - Low Priority"
contact_quality TEXT,       -- "Complete", "Phone Only"
phone TEXT,
email TEXT,
website TEXT,
address TEXT,
city TEXT,
state TEXT DEFAULT 'FL',
linkedin TEXT,
estimated_revenue TEXT,     -- free text, e.g. "$500k-$2M"
company_size TEXT,
lead_score INTEGER DEFAULT 0,  -- 0-100, calculated from data completeness
lead_status TEXT DEFAULT 'new', -- new, contacted, no_answer, researched, demo_booked, closed_won, cold
lead_type TEXT DEFAULT 'cold',  -- cold, warm, referral
notes TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `research_reports` table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
lead_id INTEGER NOT NULL REFERENCES leads(id),
status TEXT DEFAULT 'pending',  -- pending, running, complete, failed
content_json TEXT,              -- full structured report as JSON string
summary TEXT,                   -- short 2-3 sentence summary for profile card
readiness_score INTEGER,        -- 0-100, AI-generated
key_findings TEXT,              -- JSON array of strings
recommended_approach TEXT,
phone_pain_points TEXT,         -- AI analysis of phone/receptionist pain points for this business type
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
enrichment_sources TEXT         -- JSON array of URLs used
```

### `call_logs` table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
lead_id INTEGER NOT NULL REFERENCES leads(id),
logged_by TEXT NOT NULL,        -- "errol", "nick", or "shane"
call_date DATE NOT NULL,
outcome TEXT,                   -- answered, no_answer, voicemail, callback_scheduled, not_interested, interested
duration_minutes INTEGER,
follow_up_needed BOOLEAN DEFAULT 0,
follow_up_date DATE,
recording_link TEXT,
notes TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `activities` table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
lead_id INTEGER NOT NULL REFERENCES leads(id),
user TEXT NOT NULL,
activity_type TEXT,    -- call, email, dm, meeting, in_person, note, research_completed, status_change
description TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `email_drafts` table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
lead_id INTEGER NOT NULL REFERENCES leads(id),
created_by TEXT,
subject TEXT,
body TEXT,
template_used TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `dashboard_cache` table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
metric_key TEXT UNIQUE,
metric_value TEXT,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## DATA IMPORT

On first run (or when `leads` table is empty), automatically import from `data/leads.csv`.

The CSV has these columns:
`Priority Tier, Contact Quality, Business Name, Category, Phone Number, Status, AI Receptionist, Appointment Scheduled?, Call Attempts, Notes, Last Contacted`

Map them to the leads table. Calculate initial `lead_score` based on data completeness:
- Has phone: +20 points
- Has email: +20 points
- Has website: +15 points
- Has address: +15 points
- Has business name: +10 points
- Has category: +10 points
- Contact Quality = "Complete": +10 points

Max score: 100. This is the starting score — AI enrichment will refine it later.

**Include the leads CSV at `data/leads.csv` with all 640 leads pre-populated. Generate this from the spec data.**

---

## APPLICATION PAGES & ROUTES

### 1. DASHBOARD — `/dashboard`

The landing page after login. Shows the big picture.

**Top stat cards (4 in a row):**
- Total Leads (count from DB)
- Leads Contacted (status != 'new')
- Deals in Pipeline (status = 'demo_booked')
- Closed Won (status = 'closed_won') with revenue if tracked

**Charts section:**
- Revenue & Pipeline line chart — last 6 months of activity (use a lightweight chart library: Chart.js or uPlot)
- Industry Distribution donut/pie chart — shows breakdown of leads by category
- Pipeline by Stage — horizontal bar showing count per stage
- Win Rate — simple donut (won vs lost)

**Recent Activity feed** — last 10 activities across all leads

**Quick Actions** — buttons: "View All Leads", "Start Research Queue"

---

### 2. LEADS LIST — `/leads`

A searchable, filterable, sortable table of all leads.

**Search bar** at top — live search by company name as you type (client-side filter, no page reload)

**Filter bar:**
- Priority Tier (All, Tier 1, Tier 2, Tier 3)
- Category (dropdown of all 18 categories)
- Status (All, New, Contacted, Researched, Demo Booked, Closed Won, Cold)
- Contact Quality (All, Complete, Phone Only)

**Table columns:**
- Checkbox (for bulk research queue)
- Company name + category badge
- Contact info (phone + email if available)
- Priority tier pill
- Lead score (visual bar 0-100)
- Status pill (color coded)
- Research status (has report or not — "View Report" link or "No Report" grayed)
- Last activity date

**Bulk Actions bar** (appears when checkboxes selected):
- "Queue Research for X leads" button — adds selected leads to a sequential research queue, runs them one at a time to avoid rate limits, shows progress

**Pagination:** 50 leads per page, with page controls

**Export button:** Export current filtered view to CSV

---

### 3. LEAD PROFILE — `/leads/:id`

The most important page. Two-column layout.

#### LEFT COLUMN

**Company Info Card** (top left):
- Business name (large, prominent)
- Category tags (clickable — goes to leads list filtered by that category)
- Phone (click to call on mobile)
- Email (click to email)
- Website (external link)
- Address / City / State
- Estimated Revenue (from enrichment or manual)
- Company Size
- LinkedIn (external link)

**Research Intelligence Card** (below company info):
- Lead type badge (COLD / WARM / REFERRAL)
- Readiness score bar (0-100) with label "Readiness Score"
- One-liner summary (from research report)
- Key Findings (bullet list, 3-5 items)
- Phone Pain Points (specific to why this business needs an AI receptionist)
- Recommended Approach (how to pitch them)
- "View Full Report" button → opens report in a modal or expands inline
- "Run Research" button → triggers research for just this lead
- Enriched date (small text)

#### RIGHT COLUMN (4 stacked sections)

**Section 1: Call Intel**
- Dropdown at top: "All Users" / "Errol" / "Nick" / "Shane"
- Shows call log entries filtered by selected user (or all)
- Each entry shows: who called, date, outcome pill (color coded), duration, notes preview
- "Log a Call" button → opens modal with fields:
  - Date (default today)
  - Outcome (dropdown: Answered, No Answer, Voicemail, Callback Scheduled, Not Interested, Interested)
  - Duration (minutes, number input)
  - Follow-up needed? (toggle Yes/No)
  - If Yes → Follow-up date picker
  - Recording link (optional URL field)
  - Notes (textarea)
  - Submit → saves to call_logs, adds to activity timeline, updates lead status if relevant

**Section 2: Activity Timeline**
- Chronological list of all activities for this lead
- Each entry: icon (call/email/meeting/research/note), user avatar/name, description, timestamp
- "Log Activity" button → modal with:
  - Activity type dropdown
  - Description textarea
  - Date (default today)
- Call log submissions automatically create activity entries
- Research completions automatically create activity entries

**Section 3: Research Report**
- If no report: show empty state with "Run Research Report" button
- If report exists: show formatted report (see Research Report section below)
- If running: show progress indicator with status updates
- "Re-run Research" button if report exists

**Section 4: Lead Info**
- Lead Status dropdown (editable inline): New, Contacted, No Answer, Researched, Demo Booked, Closed Won, Cold
- Lead Type: Cold, Warm, Referral, Facebook, etc.
- Category tags (same as left column, clickable)
- Priority Tier
- Created date, last updated date

---

### 4. RESEARCH REPORT VIEW

Accessible via "View Full Report" button. Can be a full-page route `/leads/:id/report` or a large modal.

**Report structure (formatted like a professional brief, NOT a wall of text):**

```
[COMPANY NAME] — AI Opportunity Report
Generated: [date] | Readiness Score: [X/100]

━━━ EXECUTIVE SUMMARY ━━━
[2-3 sentence plain-English summary of the opportunity]

━━━ BUSINESS OVERVIEW ━━━
• Industry: [category]
• Estimated Size: [company size]
• Web Presence: [website quality assessment]
• Online Reputation: [review summary if found]

━━━ PHONE & RECEPTIONIST PAIN POINTS ━━━
[Specific analysis of why THIS type of business struggles with phone handling]
[Any specific signals found — reviews mentioning phones, hours, etc.]

━━━ KEY FINDINGS ━━━
• [Finding 1]
• [Finding 2]  
• [Finding 3]

━━━ RECOMMENDED APPROACH ━━━
[How to pitch this specific business — what angle to lead with, what pain to reference]

━━━ CALL SCRIPT STARTER ━━━
[A 3-4 sentence cold call opening customized for this business]

━━━ EMAIL DRAFT ━━━
Subject: [suggested subject]
[3-4 sentence cold email body]

━━━ SOURCES ━━━
[List of URLs researched]
```

---

### 5. COMMUNICATIONS — `/communications`

Three-panel layout matching the video screenshots.

**Left panel: Email Composer**
- Template selector dropdown (pre-built templates):
  - "Cold Intro — AI Receptionist"
  - "Follow-up #1"
  - "Follow-up #2"
  - "Demo Follow-up"
- Lead selector (search/select which lead this is for)
- Subject line field
- Merge tag buttons: `{first_name}` `{company_name}` `{category}` `{city}` `{pain_point}`
- Body textarea — when a template is selected AND a lead is selected, auto-populate merge tags with that lead's data
- "Generate with AI" button — calls Claude Haiku API to write a personalized email using the lead's research report data if available
- "Copy to Clipboard" button
- "Open in Email Client" button (mailto: link)

**Center panel: Activity Feed**
- Real-time feed of all recent activities across all leads
- Shows: user, action, lead name, timestamp

**Right panel: Upcoming Follow-ups**
- List of leads with follow_up_date set, sorted by date ascending
- Each entry: lead name, follow-up date, who set it, notes
- Click → goes to lead profile

---

### 6. SETTINGS — `/settings` (optional, build last)
- Change your own password (simple, updates hardcoded user in config)
- Theme preference override (light/dark/auto)
- API key status (shows green/red for Google Search API, Anthropic API)

---

## AI RESEARCH ENGINE

### Trigger Points
1. "Run Research" button on individual lead profile
2. Bulk research queue from leads list (runs sequentially with 2 second delay between each)

### Research Process (backend API route: `POST /api/leads/:id/research`)

**Step 1: Gather existing data**
Pull all known data about the lead from the DB.

**Step 2: Google Search enrichment**
If Google Search API key is configured, run these searches:
- `"[business name]" [city] [category]` — find website, address, hours
- `"[business name]" reviews` — find reputation signals
- `"[business name]" phone site:yelp.com OR site:google.com` — find phone patterns

Use Google Custom Search API (`https://www.googleapis.com/customsearch/v1`).

If no API key, skip this step and note it in the report.

**Step 3: Update lead record**
If search results contain email, website, address not already in DB — update the lead record.

**Step 4: Recalculate lead score**
Recalculate based on updated data completeness formula.

**Step 5: Generate AI Report**
Call Anthropic API (`claude-haiku-4-5-20251001` model) with this system prompt:

```
You are a sales intelligence analyst for NESVR, a company that sells AI phone receptionist services to local businesses. Your job is to analyze a business and produce a structured sales intelligence report.

The report must be formatted professionally — like a business brief, not an essay. Use section headers, bullet points for lists, and keep prose tight and scannable. No walls of text.

Focus heavily on: why this specific type of business struggles with phone handling, what their specific pain points are, and exactly how to approach them.

Output valid JSON matching this schema:
{
  "summary": "2-3 sentence executive summary",
  "readiness_score": 0-100,
  "business_overview": {
    "web_presence_quality": "string",
    "reputation_summary": "string"
  },
  "phone_pain_points": ["pain point 1", "pain point 2", "pain point 3"],
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "recommended_approach": "string - specific pitch angle for this business",
  "call_script_starter": "string - 3-4 sentence cold call opener",
  "email_subject": "string",
  "email_body": "string - 3-4 sentence cold email",
  "sources_used": ["url1", "url2"]
}

Return ONLY the JSON object. No preamble, no markdown fences.
```

User message to Claude:
```
Business Name: [name]
Category: [category]
Location: [city], FL
Phone: [phone]
Website: [website if known]
Priority Tier: [tier]
Search Results Found: [paste relevant search snippets]

Generate the sales intelligence report.
```

**Step 6: Save to DB**
Save the full JSON to `research_reports.content_json`, extract fields into their respective columns, update `leads.updated_at`.

**Step 7: Create activity entry**
Auto-log "Research report generated by [system]" to the activities table.

### Research Queue (bulk)
- `POST /api/research/queue` with array of lead IDs
- Backend processes sequentially — research lead 1, wait 2 seconds, research lead 2, etc.
- Emit progress via Server-Sent Events (SSE) or polling endpoint so frontend can show live progress
- Frontend shows: "Researching [Company Name]... (3 of 12)"

---

## DARK/LIGHT MODE

- Default: respect `prefers-color-scheme` OS setting
- Manual toggle: sun/moon icon button in top nav bar
- Preference saved to `localStorage`
- Implement using CSS custom properties:

```css
:root {
  --bg-primary: #0a0f1e;
  --bg-secondary: #111827;
  --bg-card: #1a2235;
  --text-primary: #f0f4ff;
  --text-secondary: #8b9cbf;
  --accent-blue: #3b82f6;
  --accent-silver: #94a3b8;
  --border: #1e2d45;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

[data-theme="light"] {
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-card: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --accent-blue: #2563eb;
  --accent-silver: #64748b;
  --border: #e2e8f0;
}
```

---

## NAVIGATION

Left sidebar (collapsible on mobile):
- NESVR logo/wordmark at top
- Navigation items with icons:
  - Dashboard
  - Leads
  - Communications
  - Settings
- Bottom of sidebar: logged-in user name + avatar initials + logout button

Top bar:
- Page title
- Search (global — searches leads by name)
- Dark/light toggle (sun/moon icon)
- "New Lead" button (opens modal to manually add a lead)

---

## API ROUTES REFERENCE

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/leads              ?search=&tier=&category=&status=&page=&limit=
POST   /api/leads              (create new lead)
GET    /api/leads/:id
PUT    /api/leads/:id
DELETE /api/leads/:id

GET    /api/leads/:id/calls
POST   /api/leads/:id/calls

GET    /api/leads/:id/activities
POST   /api/leads/:id/activities

GET    /api/leads/:id/report
POST   /api/leads/:id/research   (trigger single research)
POST   /api/research/queue        (bulk research queue)
GET    /api/research/queue/status (SSE or polling for queue progress)

GET    /api/leads/:id/emails
POST   /api/leads/:id/emails/generate  (AI email generation)

GET    /api/dashboard/metrics
GET    /api/activities/recent

GET    /api/communications/followups
```

---

## ENVIRONMENT VARIABLES

Create a `.env` file. The app should start and function even if API keys are missing — just disable those features gracefully.

```
PORT=3000
SESSION_SECRET=nesvr-crm-secret-2024
ANTHROPIC_API_KEY=your_key_here
GOOGLE_SEARCH_API_KEY=your_key_here
GOOGLE_SEARCH_ENGINE_ID=your_cx_here
```

---

## FILE STRUCTURE (suggested, Claude may adjust)

```
nesvr-crm/
├── server/
│   ├── index.js           — Express app entry point
│   ├── db.js              — SQLite connection + initDB()
│   ├── auth.js            — Session auth middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── leads.js
│   │   ├── research.js
│   │   ├── activities.js
│   │   ├── communications.js
│   │   └── dashboard.js
│   └── services/
│       ├── research.js    — AI research engine
│       ├── enrichment.js  — Google Search API calls
│       └── emailGen.js    — Claude email generation
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── main.js
│   │   ├── router.js
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   └── theme.css
│   │   ├── pages/
│   │   │   ├── Login.vue (or .svelte or .js)
│   │   │   ├── Dashboard.vue
│   │   │   ├── Leads.vue
│   │   │   ├── LeadProfile.vue
│   │   │   ├── ResearchReport.vue
│   │   │   ├── Communications.vue
│   │   │   └── Settings.vue
│   │   └── components/
│   │       ├── Sidebar.vue
│   │       ├── TopBar.vue
│   │       ├── LeadTable.vue
│   │       ├── StatCard.vue
│   │       ├── Modal.vue
│   │       ├── CallLogForm.vue
│   │       ├── ActivityTimeline.vue
│   │       ├── ResearchCard.vue
│   │       ├── EmailComposer.vue
│   │       └── ThemeToggle.vue
├── data/
│   └── leads.csv          — Pre-populated with all 640 leads
├── .env
├── .env.example
├── package.json
├── CLAUDE.md
├── PLAN.md                — Write this first
└── README.md              — How to run the project
```

---

## CLAUDE.md (write this file too)

```markdown
# NESVR CRM

## What this is
Internal sales CRM for NESVR (AI phone receptionist reseller). 3 users: Errol, Nick, Shane.

## Stack
[Fill in after tech stack decision]

## Run locally
npm install
npm run dev

## Key conventions
- All DB access through server/db.js
- Auth check middleware applied to all /api routes except /api/auth/*
- Lead score recalculated on every lead update
- Research reports stored as JSON in SQLite, never re-fetched from AI unless explicitly re-run
- Activity entries auto-created by: call logs, research completion, status changes
- All timestamps stored as ISO strings in SQLite

## Environment
Requires .env file. See .env.example. App degrades gracefully if API keys missing.

## Database
SQLite at ./nesvr.db. Auto-created on first run. Leads auto-imported from data/leads.csv if table empty.
```

---

## LEADS CSV DATA

The `data/leads.csv` file must contain all 640 leads from the NESVR master lead list. Here is the complete data:

**Categories and counts:**
- HVAC: 61 leads
- Law Firm - General: 61 leads
- General Contractor: 55 leads
- Water Damage / Restoration: 50 leads
- Landscaping / Lawn Care: 50 leads
- Pool Service: 48 leads
- CPA / Accounting Firm: 41 leads
- Electrical Contractor: 38 leads
- Roofing Contractor: 38 leads
- Real Estate Brokerage: 37 leads
- Pest Control: 35 leads
- Residential Home Builder: 33 leads
- Plumbing: 32 leads
- Property Management: 32 leads
- Law Firm - Criminal Defense: 8 leads
- Law Firm - Family Law: 7 leads
- Law Firm - Immigration: 7 leads
- Law Firm - Personal Injury: 7 leads

**Tier breakdown:**
- Tier 1 - High Priority: 265 leads
- Tier 2 - Medium Priority: 196 leads
- Tier 3 - Low Priority: 179 leads

**Contact quality:**
- Complete (has phone + other info): 435 leads
- Phone Only: 205 leads

**IMPORTANT:** Generate a script that reads the actual uploaded CSV file rather than hardcoding leads. The CSV import script should read from `data/leads.csv` at startup.

---

## QUALITY REQUIREMENTS

- Zero console errors on load
- Mobile responsive — sidebar collapses to hamburger on screens under 768px
- All modals closeable with Escape key
- All forms have proper validation with user-friendly error messages
- Loading states on all async operations (skeleton loaders or spinners)
- Empty states on all list views (not just blank white space)
- Toast notifications for: successful call log, research started, research complete, errors
- The app should look and feel like a real product, not a hackathon project

---

## WHAT SUCCESS LOOKS LIKE

When complete, Errol should be able to:
1. Open browser to `http://localhost:3000`
2. Log in as `errol` / `password`
3. See the dashboard with real stats from the 640 imported leads
4. Go to Leads, search for "AC Masters", click it, see the lead profile
5. Click "Run Research" and watch it pull data and generate a report
6. Log a call with outcome, notes, follow-up date
7. Go to Communications, select a template, select the lead, generate an AI email draft
8. Everything looks professional enough that showing it to a potential investor or client would not be embarrassing

---

## START HERE

Write `PLAN.md` first. Then begin Phase 1: project scaffold + database + auth + leads import. Do not skip ahead.

require('dotenv').config({ override: true });
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const { initDB } = require('./db');
const { requireAuth } = require('./auth');
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const dashboardRoutes = require('./routes/dashboard');
const activitiesRoutes = require('./routes/activities');
const communicationsRoutes = require('./routes/communications');
const researchRoutes = require('./routes/research');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDB();

// Session store using SQLite
const SQLiteStore = require('connect-sqlite3')(session);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust the first proxy (Railway, Cloudflare Tunnel) so secure cookies work over HTTPS
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === 'nesvr-crm-secret-2024') {
  console.error('\nFATAL: SESSION_SECRET is not set or is using the insecure default.');
  console.error('Set a strong random SESSION_SECRET in your .env file and restart.\n');
  process.exit(1);
}

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, '..') }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'nesvr.sid',
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // requires HTTPS in production
  },
}));

// Auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/leads', requireAuth, leadsRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/activities', requireAuth, activitiesRoutes);
app.use('/api/communications', requireAuth, communicationsRoutes);
app.use('/api/research', requireAuth, (req, res, next) => {
  // Re-route /api/research/leads/:id/research → researchRoutes
  next();
}, researchRoutes);

// Serve built frontend in production
const DIST_PATH = path.join(__dirname, '..', 'dist');
const fs = require('fs');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
} else {
  // Dev fallback
  app.get('/', (req, res) => {
    res.send(`
      <h1>NESVR CRM Server Running</h1>
      <p>Frontend not built yet. Run: <code>npm run build</code></p>
      <p>Or start Vite dev server: <code>npm run dev</code></p>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 NESVR CRM running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Not configured (research will use fallback)'}`);
  console.log(`   Google Search: ${process.env.GOOGLE_SEARCH_API_KEY ? '✓ Configured' : '✗ Not configured (enrichment disabled)'}\n`);
});

module.exports = app;

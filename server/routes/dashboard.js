const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const path = require('path');
const fs = require('fs');

router.get('/metrics', (req, res) => {
  const db = getDB();

  const total = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE deleted_at IS NULL").get().cnt;
  const contacted = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status != 'new' AND deleted_at IS NULL").get().cnt;
  const pipeline = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status = 'demo_booked' AND deleted_at IS NULL").get().cnt;
  const closed = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status = 'closed_won' AND deleted_at IS NULL").get().cnt;
  const cold = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status = 'cold' AND deleted_at IS NULL").get().cnt;
  const researched = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status = 'researched' AND deleted_at IS NULL").get().cnt;

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as cnt
    FROM leads
    WHERE category IS NOT NULL AND deleted_at IS NULL
    GROUP BY category
    ORDER BY cnt DESC
  `).all();

  const byStatus = db.prepare(`
    SELECT lead_status, COUNT(*) as cnt
    FROM leads
    WHERE deleted_at IS NULL
    GROUP BY lead_status
    ORDER BY cnt DESC
  `).all();

  const byTier = db.prepare(`
    SELECT priority_tier, COUNT(*) as cnt
    FROM leads
    WHERE priority_tier IS NOT NULL AND deleted_at IS NULL
    GROUP BY priority_tier
    ORDER BY cnt DESC
  `).all();

  const avgScore = db.prepare('SELECT AVG(lead_score) as avg FROM leads WHERE deleted_at IS NULL').get().avg;
  const pipelineValue = db.prepare("SELECT COALESCE(SUM(deal_value), 0) as total FROM leads WHERE deleted_at IS NULL AND lead_status NOT IN ('cold', 'closed_won')").get().total;
  const closedValue = db.prepare("SELECT COALESCE(SUM(deal_value), 0) as total FROM leads WHERE deleted_at IS NULL AND lead_status = 'closed_won'").get().total;
  const archivedCount = db.prepare('SELECT COUNT(*) as cnt FROM leads WHERE deleted_at IS NOT NULL').get().cnt;

  const recentActivity = db.prepare(`
    SELECT a.*, l.business_name
    FROM activities a
    JOIN leads l ON l.id = a.lead_id
    ORDER BY a.created_at DESC
    LIMIT 15
  `).all();

  const monthlyActivity = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as cnt
    FROM activities
    WHERE created_at >= date('now', '-6 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();

  res.json({
    total,
    contacted,
    pipeline,
    closed,
    cold,
    researched,
    avgScore: Math.round(avgScore || 0),
    pipelineValue,
    closedValue,
    archivedCount,
    byCategory,
    byStatus,
    byTier,
    recentActivity,
    monthlyActivity,
  });
});

// GET /api/dashboard/status — settings stats: DB counts + API key status
router.get('/status', (req, res) => {
  const db = getDB();

  const leads = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE deleted_at IS NULL").get().cnt;
  const reports = db.prepare("SELECT COUNT(*) as cnt FROM research_reports WHERE deleted_at IS NULL").get().cnt;
  const calls = db.prepare("SELECT COUNT(*) as cnt FROM call_logs WHERE deleted_at IS NULL").get().cnt;
  const activitiesCount = db.prepare("SELECT COUNT(*) as cnt FROM activities").get().cnt;
  const archived = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE deleted_at IS NOT NULL").get().cnt;

  // DB file size
  let dbSizeBytes = 0;
  try {
    const dbPath = path.join(__dirname, '..', '..', 'nesvr.db');
    dbSizeBytes = fs.statSync(dbPath).size;
  } catch {}
  const dbSizeMB = (dbSizeBytes / (1024 * 1024)).toFixed(2);

  res.json({
    db: { leads, reports, calls, activities: activitiesCount, archived, sizeMB: dbSizeMB },
    api: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID),
    },
  });
});

module.exports = router;

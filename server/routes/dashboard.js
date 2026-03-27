const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

router.get('/metrics', (req, res) => {
  const db = getDB();

  const total = db.prepare('SELECT COUNT(*) as cnt FROM leads').get().cnt;
  const contacted = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status != 'new'").get().cnt;
  const pipeline = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status = 'demo_booked'").get().cnt;
  const closed = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status = 'closed_won'").get().cnt;
  const researched = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE lead_status = 'researched'").get().cnt;

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as cnt
    FROM leads
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY cnt DESC
  `).all();

  const byStatus = db.prepare(`
    SELECT lead_status, COUNT(*) as cnt
    FROM leads
    GROUP BY lead_status
    ORDER BY cnt DESC
  `).all();

  const byTier = db.prepare(`
    SELECT priority_tier, COUNT(*) as cnt
    FROM leads
    WHERE priority_tier IS NOT NULL
    GROUP BY priority_tier
    ORDER BY cnt DESC
  `).all();

  const avgScore = db.prepare('SELECT AVG(lead_score) as avg FROM leads').get().avg;

  const recentActivity = db.prepare(`
    SELECT a.*, l.business_name
    FROM activities a
    JOIN leads l ON l.id = a.lead_id
    ORDER BY a.created_at DESC
    LIMIT 15
  `).all();

  // Monthly activity for last 6 months
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
    researched,
    avgScore: Math.round(avgScore || 0),
    byCategory,
    byStatus,
    byTier,
    recentActivity,
    monthlyActivity,
  });
});

module.exports = router;

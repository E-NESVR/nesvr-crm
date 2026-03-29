const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// GET /api/activities/recent — small feed for dashboard
router.get('/recent', (req, res) => {
  const db = getDB();
  const limit = Math.min(parseInt(req.query.limit) || 20, 500);
  const activities = db.prepare(`
    SELECT a.*, l.business_name
    FROM activities a
    JOIN leads l ON l.id = a.lead_id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(activities);
});

// GET /api/activities/all — paginated full feed with filters
router.get('/all', (req, res) => {
  const db = getDB();
  const {
    user = '',
    activity_type = '',
    page = 1,
    limit = 50,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const pageLimit = Math.min(Math.max(1, parseInt(limit)), 100);
  const offset = (pageNum - 1) * pageLimit;

  const conditions = [];
  const params = [];

  if (user && user !== 'all') {
    conditions.push('a.user = ?');
    params.push(user);
  }
  if (activity_type && activity_type !== 'all') {
    conditions.push('a.activity_type = ?');
    params.push(activity_type);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const total = db.prepare(`
    SELECT COUNT(*) as cnt FROM activities a ${where}
  `).get(...params).cnt;

  const activities = db.prepare(`
    SELECT a.*, l.business_name
    FROM activities a
    JOIN leads l ON l.id = a.lead_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageLimit, offset);

  res.json({
    activities,
    total,
    page: pageNum,
    limit: pageLimit,
    pages: Math.ceil(total / pageLimit),
  });
});

module.exports = router;

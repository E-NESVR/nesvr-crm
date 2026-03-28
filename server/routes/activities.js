const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

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

module.exports = router;

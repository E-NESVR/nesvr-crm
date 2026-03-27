const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

router.get('/followups', (req, res) => {
  const db = getDB();
  const followups = db.prepare(`
    SELECT cl.*, l.business_name, l.category
    FROM call_logs cl
    JOIN leads l ON l.id = cl.lead_id
    WHERE cl.follow_up_needed = 1
      AND cl.follow_up_date IS NOT NULL
      AND cl.follow_up_date >= date('now')
    ORDER BY cl.follow_up_date ASC
    LIMIT 50
  `).all();
  res.json(followups);
});

router.post('/leads/:id/emails/generate', (req, res) => {
  // Handled by research service — just save draft here
  const db = getDB();
  const { subject, body, template_used } = req.body;
  const result = db.prepare(`
    INSERT INTO email_drafts (lead_id, created_by, subject, body, template_used)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, req.session.user.username, subject, body, template_used || null);
  const draft = db.prepare('SELECT * FROM email_drafts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(draft);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { runResearch, runQueue, getQueueStatus } = require('../services/research');
const { generateAIEmail, TEMPLATES } = require('../services/emailGen');

// POST /api/leads/:id/research — trigger single research
router.post('/leads/:id/research', async (req, res) => {
  try {
    const report = await runResearch(req.params.id);
    res.json({ ok: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/research/queue — start bulk research queue
router.post('/queue', async (req, res) => {
  const { leadIds } = req.body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds array required' });
  }
  const result = await runQueue(leadIds);
  res.json(result);
});

// GET /api/research/queue/status — polling endpoint
router.get('/queue/status', (req, res) => {
  res.json(getQueueStatus());
});

// GET /api/research/queue/stream — SSE stream
router.get('/queue/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const interval = setInterval(() => {
    const status = getQueueStatus();
    res.write(`data: ${JSON.stringify(status)}\n\n`);
    if (!status.running) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);

  req.on('close', () => clearInterval(interval));
});

// POST /api/leads/:id/emails/generate
router.post('/leads/:id/emails/generate', async (req, res) => {
  const db = getDB();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const report = db.prepare('SELECT * FROM research_reports WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);
  const { template } = req.body;

  try {
    const result = await generateAIEmail(lead, report, template || 'cold_intro');

    // Save draft
    const savedDraft = db.prepare(`
      INSERT INTO email_drafts (lead_id, created_by, subject, body, template_used)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, req.session.user.username, result.subject, result.body, template || 'cold_intro');

    res.json({ ...result, draft_id: savedDraft.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/research/templates
router.get('/templates', (req, res) => {
  res.json(
    Object.entries(TEMPLATES).map(([key, t]) => ({
      key,
      name: t.name,
      subject: t.subject,
      body: t.body,
    }))
  );
});

module.exports = router;

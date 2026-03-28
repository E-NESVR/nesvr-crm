const express = require('express');
const router = express.Router();
const { getDB, calculateLeadScore } = require('../db');
const { enrichLead } = require('../services/enrichment');

// Input validation helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;
const PHONE_RE = /^[\d\s().+\-]{7,20}$/;

function validateLeadFields({ email, website, linkedin, phone }) {
  const errors = [];
  if (email && !EMAIL_RE.test(email)) errors.push('Invalid email format');
  if (website && !URL_RE.test(website)) errors.push('Website must start with http:// or https://');
  if (linkedin && !URL_RE.test(linkedin)) errors.push('LinkedIn URL must start with http:// or https://');
  if (phone && !PHONE_RE.test(phone)) errors.push('Invalid phone number format');
  return errors;
}

// GET /api/leads
router.get('/', (req, res) => {
  const db = getDB();
  const {
    search = '',
    tier = '',
    category = '',
    status = '',
    contact_quality = '',
    page = 1,
    limit = 50,
    sort = 'updated_at',
    order = 'desc',
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['l.deleted_at IS NULL'];
  const params = {};

  if (search) {
    conditions.push('(l.business_name LIKE @search OR l.phone LIKE @search OR l.category LIKE @search)');
    params.search = `%${search}%`;
  }
  if (tier) {
    conditions.push('l.priority_tier = @tier');
    params.tier = tier;
  }
  if (category) {
    conditions.push('l.category = @category');
    params.category = category;
  }
  if (status) {
    conditions.push('l.lead_status = @status');
    params.status = status;
  }
  if (contact_quality) {
    conditions.push('l.contact_quality = @contact_quality');
    params.contact_quality = contact_quality;
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const allowedSorts = ['business_name', 'updated_at', 'created_at', 'lead_score', 'priority_tier', 'lead_status'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'updated_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM leads l ${where}`).get(params);

  const leads = db.prepare(`
    SELECT l.*,
      rr.status AS research_status,
      rr.readiness_score,
      act.last_activity_at
    FROM leads l
    LEFT JOIN (
      SELECT lead_id, status, readiness_score,
        ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY created_at DESC) AS rn
      FROM research_reports
      WHERE deleted_at IS NULL
    ) rr ON rr.lead_id = l.id AND rr.rn = 1
    LEFT JOIN (
      SELECT lead_id, MAX(created_at) AS last_activity_at
      FROM activities
      GROUP BY lead_id
    ) act ON act.lead_id = l.id
    ${where}
    ORDER BY l.${sortCol} ${sortDir}
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: parseInt(limit), offset });

  res.json({
    leads,
    total: total.cnt,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total.cnt / parseInt(limit)),
  });
});

// GET /api/leads/archived
router.get('/archived', (req, res) => {
  const db = getDB();
  const leads = db.prepare(`
    SELECT l.*, l.deleted_by, l.delete_reason, l.deleted_at
    FROM leads l
    WHERE l.deleted_at IS NOT NULL
    ORDER BY l.deleted_at DESC
  `).all();
  res.json(leads);
});

// POST /api/leads/:id/restore
router.post('/:id/restore', (req, res) => {
  const db = getDB();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND deleted_at IS NOT NULL').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Archived lead not found' });

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`UPDATE leads SET deleted_at=NULL, deleted_by=NULL, delete_reason=NULL, updated_at=? WHERE id=?`).run(now, req.params.id);
    db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'note', ?)`).run(
      req.params.id, req.session.user.username, 'Lead restored from archive'
    );
  })();

  const restored = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(restored);
});

// PUT /api/leads/bulk-status — set status for multiple leads at once
router.put('/bulk-status', (req, res) => {
  const db = getDB();
  const { ids, status } = req.body;
  const validStatuses = ['new', 'contacted', 'no_answer', 'researched', 'demo_booked', 'closed_won', 'cold'];

  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const now = new Date().toISOString();
  const updateStmt = db.prepare(`UPDATE leads SET lead_status=?, updated_at=? WHERE id=? AND deleted_at IS NULL`);
  const actStmt = db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'status_change', ?)`);

  const bulkUpdate = db.transaction(() => {
    for (const id of ids) {
      updateStmt.run(status, now, id);
      actStmt.run(id, req.session.user.username, `Status changed to ${status} (bulk update)`);
    }
  });
  bulkUpdate();

  res.json({ ok: true, updated: ids.length });
});

// POST /api/leads/:id/enrich — run Google enrichment to fill in missing fields
router.post('/:id/enrich', async (req, res) => {
  const db = getDB();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const enriched = await enrichLead(lead);

    if (enriched.skipped) {
      return res.json({ ok: true, skipped: true, message: 'Google Search API not configured' });
    }

    const updates = {};
    if (!lead.website && enriched.website) updates.website = enriched.website;

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k}=@${k}`).join(', ');
      db.transaction(() => {
        db.prepare(`UPDATE leads SET ${setClauses}, updated_at=@updated_at WHERE id=@id`).run({
          ...updates, updated_at: new Date().toISOString(), id: req.params.id
        });
        db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'note', ?)`).run(
          req.params.id, req.session.user.username,
          `Lead enriched — found: ${Object.keys(updates).join(', ')}`
        );
      })();
    }

    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    res.json({ ok: true, lead: updatedLead, found: Object.keys(updates), sources: enriched.sources });
  } catch (err) {
    console.error('[enrich] error:', err.message);
    res.status(500).json({ error: 'Enrichment failed' });
  }
});

// GET /api/leads/categories
router.get('/categories', (req, res) => {
  const db = getDB();
  const categories = db.prepare('SELECT DISTINCT category FROM leads WHERE category IS NOT NULL AND deleted_at IS NULL ORDER BY category').all();
  res.json(categories.map(c => c.category));
});

// GET /api/leads/export
router.get('/export', (req, res) => {
  const db = getDB();
  const { search = '', tier = '', category = '', status = '', contact_quality = '' } = req.query;

  const conditions = ['deleted_at IS NULL'];
  const params = {};

  if (search) { conditions.push('business_name LIKE @search'); params.search = `%${search}%`; }
  if (tier) { conditions.push('priority_tier = @tier'); params.tier = tier; }
  if (category) { conditions.push('category = @category'); params.category = category; }
  if (status) { conditions.push('lead_status = @status'); params.status = status; }
  if (contact_quality) { conditions.push('contact_quality = @contact_quality'); params.contact_quality = contact_quality; }

  const where = 'WHERE ' + conditions.join(' AND ');
  const leads = db.prepare(`SELECT * FROM leads ${where} ORDER BY priority_tier, business_name`).all(params);

  const headers = ['id', 'business_name', 'category', 'priority_tier', 'contact_quality', 'phone', 'email', 'website', 'address', 'city', 'lead_status', 'lead_score', 'notes', 'created_at'];
  const csv = [
    headers.join(','),
    ...leads.map(l => headers.map(h => JSON.stringify(l[h] ?? '')).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="nesvr-leads.csv"');
  res.send(csv);
});

// POST /api/leads
router.post('/', (req, res) => {
  const db = getDB();
  const {
    business_name, category, priority_tier, contact_quality,
    phone, email, website, address, city, state, linkedin,
    estimated_revenue, company_size, lead_status, lead_type, notes,
  } = req.body;

  if (!business_name) return res.status(400).json({ error: 'Business name required' });

  const fieldErrors = validateLeadFields({ email, website, linkedin, phone });
  if (fieldErrors.length) return res.status(400).json({ error: fieldErrors.join('; ') });

  const lead = {
    business_name, category, priority_tier, contact_quality,
    phone, email, website, address, city, state: state || 'FL', linkedin,
    estimated_revenue, company_size,
    lead_status: lead_status || 'new',
    lead_type: lead_type || 'cold',
    notes,
  };
  lead.lead_score = calculateLeadScore(lead);

  const stmt = db.prepare(`
    INSERT INTO leads (
      business_name, category, priority_tier, contact_quality,
      phone, email, website, address, city, state, linkedin,
      estimated_revenue, company_size, lead_score, lead_status, lead_type, notes
    ) VALUES (
      @business_name, @category, @priority_tier, @contact_quality,
      @phone, @email, @website, @address, @city, @state, @linkedin,
      @estimated_revenue, @company_size, @lead_score, @lead_status, @lead_type, @notes
    )
  `);

  let newLead;
  db.transaction(() => {
    const result = stmt.run(lead);
    db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'note', ?)`).run(
      result.lastInsertRowid, req.session.user.username, 'Lead created'
    );
    newLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
  })();

  res.status(201).json(newLead);
});

// GET /api/leads/:id
router.get('/:id', (req, res) => {
  const db = getDB();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const report = db.prepare('SELECT * FROM research_reports WHERE lead_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1').get(req.params.id);
  res.json({ ...lead, report: report || null });
});

// PUT /api/leads/:id
router.put('/:id', (req, res) => {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lead not found' });

  const updatable = [
    'business_name', 'category', 'priority_tier', 'contact_quality',
    'phone', 'email', 'website', 'address', 'city', 'state', 'linkedin',
    'estimated_revenue', 'company_size', 'lead_status', 'lead_type', 'notes', 'deal_value',
  ];

  // Validate any format-sensitive fields that are being changed
  const fieldErrors = validateLeadFields({
    email:    req.body.email    !== undefined ? req.body.email    : null,
    website:  req.body.website  !== undefined ? req.body.website  : null,
    linkedin: req.body.linkedin !== undefined ? req.body.linkedin : null,
    phone:    req.body.phone    !== undefined ? req.body.phone    : null,
  });
  if (fieldErrors.length) return res.status(400).json({ error: fieldErrors.join('; ') });

  const updated = { ...existing };
  let statusChanged = false;

  for (const field of updatable) {
    if (req.body[field] !== undefined) {
      if (field === 'lead_status' && req.body[field] !== existing.lead_status) {
        statusChanged = true;
      }
      updated[field] = req.body[field];
    }
  }

  updated.lead_score = calculateLeadScore(updated);
  updated.updated_at = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      UPDATE leads SET
        business_name=@business_name, category=@category, priority_tier=@priority_tier,
        contact_quality=@contact_quality, phone=@phone, email=@email, website=@website,
        address=@address, city=@city, state=@state, linkedin=@linkedin,
        estimated_revenue=@estimated_revenue, company_size=@company_size,
        lead_score=@lead_score, lead_status=@lead_status, lead_type=@lead_type,
        notes=@notes, deal_value=@deal_value, updated_at=@updated_at
      WHERE id=@id
    `).run({ ...updated, id: req.params.id });

    if (statusChanged) {
      db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'status_change', ?)`).run(
        req.params.id, req.session.user.username, `Status changed to ${updated.lead_status}`
      );
    }
  })();

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(lead);
});

// DELETE /api/leads/:id — soft delete with required reason
router.delete('/:id', (req, res) => {
  const db = getDB();
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A reason for deletion is required' });
  }

  const existing = db.prepare('SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Lead not found' });

  const now = new Date().toISOString();
  const user = req.session.user.username;

  db.transaction(() => {
    db.prepare(`
      UPDATE leads SET deleted_at=?, deleted_by=?, delete_reason=?, updated_at=?
      WHERE id=?
    `).run(now, user, reason.trim(), now, req.params.id);

    // Log to activities so it shows in recent activity feed
    db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'note', ?)`).run(
      req.params.id, user,
      `Lead deleted — ${reason.trim()}`
    );
  })();

  res.json({ ok: true, message: `Lead "${existing.business_name}" archived` });
});

// GET /api/leads/:id/calls
router.get('/:id/calls', (req, res) => {
  const db = getDB();
  const { user } = req.query;
  let stmt = 'SELECT * FROM call_logs WHERE lead_id = ? AND deleted_at IS NULL';
  const params = [req.params.id];
  if (user && user !== 'all') {
    stmt += ' AND logged_by = ?';
    params.push(user);
  }
  stmt += ' ORDER BY call_date DESC, created_at DESC';
  const calls = db.prepare(stmt).all(...params);
  res.json(calls);
});

// POST /api/leads/:id/calls
router.post('/:id/calls', (req, res) => {
  const db = getDB();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { call_date, outcome, duration_minutes, follow_up_needed, follow_up_date, recording_link, notes } = req.body;

  if (!call_date || !outcome) {
    return res.status(400).json({ error: 'call_date and outcome are required' });
  }

  let call;
  db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO call_logs (lead_id, logged_by, call_date, outcome, duration_minutes, follow_up_needed, follow_up_date, recording_link, notes)
      VALUES (@lead_id, @logged_by, @call_date, @outcome, @duration_minutes, @follow_up_needed, @follow_up_date, @recording_link, @notes)
    `).run({
      lead_id: req.params.id,
      logged_by: req.session.user.username,
      call_date, outcome,
      duration_minutes: duration_minutes || null,
      follow_up_needed: follow_up_needed ? 1 : 0,
      follow_up_date: follow_up_date || null,
      recording_link: recording_link || null,
      notes: notes || null,
    });

    db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'call', ?)`).run(
      req.params.id, req.session.user.username,
      `Call logged — ${outcome}${notes ? ': ' + notes.substring(0, 100) : ''}`
    );

    if (outcome === 'interested' || outcome === 'callback_scheduled') {
      db.prepare(`UPDATE leads SET lead_status='contacted', updated_at=? WHERE id=? AND lead_status='new'`).run(new Date().toISOString(), req.params.id);
    } else if (outcome === 'no_answer' || outcome === 'voicemail') {
      db.prepare(`UPDATE leads SET lead_status='no_answer', updated_at=? WHERE id=? AND lead_status='new'`).run(new Date().toISOString(), req.params.id);
    }

    call = db.prepare('SELECT * FROM call_logs WHERE id = ?').get(result.lastInsertRowid);
  })();

  res.status(201).json(call);
});

// DELETE /api/leads/:id/calls/:callId — soft delete with required reason
router.delete('/:id/calls/:callId', (req, res) => {
  const db = getDB();
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A reason for deletion is required' });
  }

  const call = db.prepare('SELECT * FROM call_logs WHERE id = ? AND lead_id = ? AND deleted_at IS NULL').get(req.params.callId, req.params.id);
  if (!call) return res.status(404).json({ error: 'Call log not found' });

  const now = new Date().toISOString();
  const user = req.session.user.username;

  db.transaction(() => {
    db.prepare(`UPDATE call_logs SET deleted_at=?, deleted_by=?, delete_reason=? WHERE id=?`).run(now, user, reason.trim(), req.params.callId);
    db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'note', ?)`).run(
      req.params.id, user,
      `Call log deleted (${call.call_date}, ${call.outcome}) — ${reason.trim()}`
    );
  })();

  res.json({ ok: true });
});

// GET /api/leads/:id/activities
router.get('/:id/activities', (req, res) => {
  const db = getDB();
  const activities = db.prepare('SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(activities);
});

// POST /api/leads/:id/activities
router.post('/:id/activities', (req, res) => {
  const db = getDB();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { activity_type, description } = req.body;
  if (!activity_type || !description) {
    return res.status(400).json({ error: 'activity_type and description required' });
  }

  const result = db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, ?, ?)`).run(
    req.params.id, req.session.user.username, activity_type, description
  );

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(activity);
});

// GET /api/leads/:id/report
router.get('/:id/report', (req, res) => {
  const db = getDB();
  const report = db.prepare('SELECT * FROM research_reports WHERE lead_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'No report found' });
  res.json(report);
});

// DELETE /api/leads/:id/report — soft delete the active research report
router.delete('/:id/report', (req, res) => {
  const db = getDB();
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A reason for deletion is required' });
  }

  const report = db.prepare('SELECT * FROM research_reports WHERE lead_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'No active report found' });

  const now = new Date().toISOString();
  const user = req.session.user.username;

  db.transaction(() => {
    db.prepare(`UPDATE research_reports SET deleted_at=?, deleted_by=?, delete_reason=? WHERE id=?`).run(now, user, reason.trim(), report.id);
    // Also reset the lead status from 'researched' back to 'contacted' if applicable
    db.prepare(`UPDATE leads SET lead_status='contacted', updated_at=? WHERE id=? AND lead_status='researched'`).run(now, req.params.id);
    db.prepare(`INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, ?, 'note', ?)`).run(
      req.params.id, user,
      `Research report deleted — ${reason.trim()}`
    );
  })();

  res.json({ ok: true });
});

// GET /api/leads/:id/emails
router.get('/:id/emails', (req, res) => {
  const db = getDB();
  const emails = db.prepare('SELECT * FROM email_drafts WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(emails);
});

module.exports = router;

const Anthropic = require('@anthropic-ai/sdk');
const { getDB, calculateLeadScore } = require('../db');
const { enrichLead } = require('./enrichment');

const SYSTEM_PROMPT = `You are a sales intelligence analyst for NESVR, a company that sells AI phone receptionist services to local businesses. Your job is to analyze a business and produce a structured sales intelligence report.

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

Return ONLY the JSON object. No preamble, no markdown fences.`;

async function runResearch(leadId) {
  const db = getDB();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!lead) throw new Error('Lead not found');

  // Check if Anthropic key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    // Still run the report with a placeholder
    const fallback = generateFallbackReport(lead);
    saveReport(db, leadId, fallback, []);
    return fallback;
  }

  // Mark report as running
  const existingReport = db.prepare('SELECT id FROM research_reports WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1').get(leadId);
  let reportId;
  if (existingReport) {
    db.prepare("UPDATE research_reports SET status='running' WHERE id=?").run(existingReport.id);
    reportId = existingReport.id;
  } else {
    const r = db.prepare("INSERT INTO research_reports (lead_id, status) VALUES (?, 'running')").run(leadId);
    reportId = r.lastInsertRowid;
  }

  try {
    // Step 1: Enrich with Google Search
    const enrichment = await enrichLead(lead);

    // Update website if discovered
    if (enrichment.website && !lead.website) {
      db.prepare("UPDATE leads SET website=?, updated_at=? WHERE id=?").run(
        enrichment.website, new Date().toISOString(), leadId
      );
    }

    // Step 2: Call Claude
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userMessage = `Business Name: ${lead.business_name}
Category: ${lead.category || 'Unknown'}
Location: ${lead.city || 'Jacksonville'}, FL
Phone: ${lead.phone || 'Unknown'}
Website: ${lead.website || enrichment.website || 'Unknown'}
Priority Tier: ${lead.priority_tier || 'Unknown'}
Search Results Found:
${enrichment.snippets || '(No search results — API key not configured)'}

Generate the sales intelligence report.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content[0].text.trim();
    let reportData;

    try {
      // Strip markdown fences if present
      const cleaned = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      reportData = JSON.parse(cleaned);
    } catch {
      throw new Error('AI returned invalid JSON: ' + rawText.substring(0, 200));
    }

    // Add sources from enrichment
    if (!reportData.sources_used || reportData.sources_used.length === 0) {
      reportData.sources_used = enrichment.sources;
    }

    // Step 3: Save report
    saveReport(db, leadId, reportData, enrichment.sources, reportId);

    // Step 4: Update lead score
    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
    const newScore = calculateLeadScore(updatedLead);
    db.prepare("UPDATE leads SET lead_score=?, lead_status=CASE WHEN lead_status='new' THEN 'researched' ELSE lead_status END, updated_at=? WHERE id=?").run(
      newScore, new Date().toISOString(), leadId
    );

    // Step 5: Log activity
    db.prepare("INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, 'system', 'research_completed', ?)").run(
      leadId, `Research report generated (Readiness Score: ${reportData.readiness_score}/100)`
    );

    return reportData;
  } catch (err) {
    db.prepare("UPDATE research_reports SET status='failed' WHERE id=?").run(reportId);
    throw err;
  }
}

function saveReport(db, leadId, reportData, sources, reportId) {
  const now = new Date().toISOString();
  const keyFindings = JSON.stringify(reportData.key_findings || []);
  const phonePainPoints = JSON.stringify(reportData.phone_pain_points || []);
  const enrichmentSources = JSON.stringify(sources || reportData.sources_used || []);

  if (reportId) {
    db.prepare(`
      UPDATE research_reports SET
        status='complete',
        content_json=@content_json,
        summary=@summary,
        readiness_score=@readiness_score,
        key_findings=@key_findings,
        recommended_approach=@recommended_approach,
        phone_pain_points=@phone_pain_points,
        enrichment_sources=@enrichment_sources
      WHERE id=@id
    `).run({
      content_json: JSON.stringify(reportData),
      summary: reportData.summary,
      readiness_score: reportData.readiness_score,
      key_findings: keyFindings,
      recommended_approach: reportData.recommended_approach,
      phone_pain_points: phonePainPoints,
      enrichment_sources: enrichmentSources,
      id: reportId,
    });
  } else {
    db.prepare(`
      INSERT INTO research_reports (lead_id, status, content_json, summary, readiness_score, key_findings, recommended_approach, phone_pain_points, enrichment_sources)
      VALUES (@lead_id, 'complete', @content_json, @summary, @readiness_score, @key_findings, @recommended_approach, @phone_pain_points, @enrichment_sources)
    `).run({
      lead_id: leadId,
      content_json: JSON.stringify(reportData),
      summary: reportData.summary,
      readiness_score: reportData.readiness_score,
      key_findings: keyFindings,
      recommended_approach: reportData.recommended_approach,
      phone_pain_points: phonePainPoints,
      enrichment_sources: enrichmentSources,
    });
  }
}

function generateFallbackReport(lead) {
  const category = lead.category || 'business';
  return {
    summary: `${lead.business_name} is a ${category} in Jacksonville, FL. Configure your Anthropic API key to generate AI-powered research reports.`,
    readiness_score: lead.lead_score || 50,
    business_overview: {
      web_presence_quality: lead.website ? 'Has website' : 'No website found',
      reputation_summary: 'Requires Google Search API key to assess',
    },
    phone_pain_points: [
      `${category} businesses typically miss calls during peak hours`,
      'Manual scheduling wastes staff time',
      'After-hours calls go unanswered',
    ],
    key_findings: [
      `Phone: ${lead.phone || 'Not available'}`,
      `Contact Quality: ${lead.contact_quality || 'Unknown'}`,
      `Priority: ${lead.priority_tier || 'Unknown'}`,
    ],
    recommended_approach: `Lead with the missed-call pain point. Ask how many calls they miss per week. Offer a free trial.`,
    call_script_starter: `Hi, is this ${lead.business_name}? Great — I'm calling from NESVR. We help ${category} businesses in Jacksonville stop losing customers to unanswered phones. Do you have 60 seconds?`,
    email_subject: `Stop missing calls — ${lead.business_name}`,
    email_body: `Hi there,\n\nI help ${category} businesses in Jacksonville never miss another customer call with an AI receptionist that handles calls 24/7.\n\nWould you be open to a quick 10-minute demo this week?\n\n— NESVR Team`,
    sources_used: [],
  };
}

// Research queue state (in-memory)
const queueState = {
  running: false,
  queue: [],
  current: null,
  completed: 0,
  total: 0,
  errors: [],
};

async function runQueue(leadIds) {
  if (queueState.running) {
    return { error: 'Queue already running' };
  }

  queueState.running = true;
  queueState.queue = [...leadIds];
  queueState.total = leadIds.length;
  queueState.completed = 0;
  queueState.current = null;
  queueState.errors = [];

  (async () => {
    for (const id of leadIds) {
      queueState.current = id;
      try {
        await runResearch(id);
        queueState.completed++;
      } catch (err) {
        queueState.errors.push({ id, error: err.message });
        queueState.completed++;
      }
      // 2 second delay between requests
      if (queueState.queue.indexOf(id) < queueState.queue.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    queueState.running = false;
    queueState.current = null;
  })();

  return { started: true, total: leadIds.length };
}

function getQueueStatus() {
  return { ...queueState };
}

module.exports = { runResearch, runQueue, getQueueStatus };

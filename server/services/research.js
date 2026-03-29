const Anthropic = require('@anthropic-ai/sdk');
const { getDB, calculateLeadScore } = require('../db');
const { enrichLead } = require('./enrichment');

const SYSTEM_PROMPT = `You are a sales intelligence analyst for NESVR, a company that sells AI phone receptionist services to local businesses in Jacksonville, FL. Your job is to analyze a SPECIFIC business and produce a structured, highly personalized sales intelligence report.

CRITICAL RULES:
- Reference the specific business by name throughout the entire report — never say "HVAC companies" when you can say "A/C Masters Enterprises"
- Use specific details found in the search results and website content — reviews, ratings, staff mentions, hours, services
- If you found reviews mentioning hold times, no answer, or phone issues — quote them or reference them specifically
- The recommended_approach and call_script_starter MUST mention the business by name and use specific findings, not generic category pitches
- For estimated_revenue: use business type, category, apparent size, staff signals, and local market data to make an educated estimate

Output valid JSON matching this schema exactly:
{
  "summary": "2-3 sentence executive summary referencing this specific business by name",
  "readiness_score": 0-100,
  "estimated_revenue": "Estimated annual revenue, e.g. '$500K - $1.2M' based on business type, apparent size, and market norms. Never leave blank — always make an educated estimate.",
  "estimated_deal_size": "Monthly recurring revenue estimate for NESVR service, e.g. '$299 - $499/mo' based on call volume implied by business type and size",
  "business_overview": {
    "web_presence_quality": "Specific assessment of THIS business's web presence based on what was found",
    "reputation_summary": "Specific review/rating summary for THIS business if found, or assessment based on web presence"
  },
  "business_specific_findings": "2-3 sentences about what was found specifically about THIS business — reviews, news, web presence quality, staff size signals, years in business, etc.",
  "local_context": "1-2 sentences about the Jacksonville FL market context for this specific category and how it affects this business",
  "specific_pain_signals": "Any specific signals found that THIS business struggles with phone handling — e.g. reviews mentioning hold times, no answer, slow response, or any indicators of high call volume without adequate staffing. If none found, note what the typical pain is for this category.",
  "competition_context": "Brief note on local competition in their category in Jacksonville and how that creates urgency for lead handling",
  "phone_pain_points": ["3-5 specific pain points for THIS business based on their category, size, and any signals found"],
  "key_findings": ["3-5 specific findings about THIS business — not generic category facts"],
  "recommended_approach": "Specific pitch angle referencing this business by name and using specific details found. Not a generic category pitch.",
  "call_script_starter": "3-4 sentence cold call opener that mentions the business by name and references a specific finding or pain signal",
  "email_subject": "Personalized subject line mentioning the business name",
  "email_body": "3-4 sentence cold email referencing this specific business and any specific finding",
  "sources_searched": ["list every URL and search query used during research"]
}

Return ONLY the JSON object. No preamble, no markdown fences.`;

async function runResearch(leadId) {
  const db = getDB();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!lead) throw new Error('Lead not found');

  // Check if Anthropic key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    const fallback = generateFallbackReport(lead);
    saveReport(db, leadId, fallback, []);
    return fallback;
  }

  // Mark report as running
  const existingReport = db.prepare('SELECT id FROM research_reports WHERE lead_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1').get(leadId);
  let reportId;
  if (existingReport) {
    db.prepare("UPDATE research_reports SET status='running' WHERE id=?").run(existingReport.id);
    reportId = existingReport.id;
  } else {
    const r = db.prepare("INSERT INTO research_reports (lead_id, status) VALUES (?, 'running')").run(leadId);
    reportId = r.lastInsertRowid;
  }

  try {
    // Step 1: Enrich with Google Search (multiple queries + homepage fetch)
    const enrichment = await enrichLead(lead);

    // Update website if discovered during enrichment
    if (enrichment.website && !lead.website) {
      db.prepare("UPDATE leads SET website=?, updated_at=? WHERE id=?").run(
        enrichment.website, new Date().toISOString(), leadId
      );
      lead.website = enrichment.website;
    }

    // Step 2: Call Claude with all enrichment context
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const websiteDisplay = lead.website || enrichment.website || 'Not found';
    const homepageSection = enrichment.homepageText
      ? `\nWebsite Homepage Content (first 2000 chars):\n${enrichment.homepageText}`
      : '';

    const userMessage = `Business Name: ${lead.business_name}
Category: ${lead.category || 'Unknown'}
Location: ${lead.city || 'Jacksonville'}, FL
Phone: ${lead.phone || 'Not available'}
Email: ${lead.email || 'Not available'}
Website: ${websiteDisplay}
Address: ${lead.address || 'Not available'}
Priority Tier: ${lead.priority_tier || 'Unknown'}
Contact Quality: ${lead.contact_quality || 'Unknown'}

Search Queries Used: ${enrichment.queriesUsed ? enrichment.queriesUsed.join(' | ') : 'N/A'}

Web Search Results:
${enrichment.snippets || '(No search results — Google Search API not configured)'}
${homepageSection}

Generate a highly personalized sales intelligence report for ${lead.business_name} specifically. Reference this business by name throughout.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content[0].text.trim();
    let reportData;

    try {
      const cleaned = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      reportData = JSON.parse(cleaned);
    } catch {
      throw new Error('AI returned invalid JSON: ' + rawText.substring(0, 200));
    }

    // Merge sources_searched from enrichment queries + any the AI listed
    const allSources = [
      ...(enrichment.queriesUsed || []),
      ...(enrichment.sources || []),
      ...(reportData.sources_used || []),
    ].filter(Boolean);
    reportData.sources_searched = allSources;
    if (!reportData.sources_used || reportData.sources_used.length === 0) {
      reportData.sources_used = enrichment.sources || [];
    }

    // Step 3: Save report
    saveReport(db, leadId, reportData, enrichment.sources, reportId);

    // Step 4: Save estimated_revenue to lead if found and not already set
    if (reportData.estimated_revenue && reportData.estimated_revenue !== 'Unknown') {
      db.prepare("UPDATE leads SET estimated_revenue=?, updated_at=? WHERE id=? AND (estimated_revenue IS NULL OR estimated_revenue='')").run(
        reportData.estimated_revenue, new Date().toISOString(), leadId
      );
    }

    // Step 5: Recalculate lead score with research bonus
    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
    const baseScore = calculateLeadScore(updatedLead);
    let bonus = 15; // has complete research report
    if (reportData.readiness_score) {
      bonus += Math.round(reportData.readiness_score * 0.10);
    }
    const newScore = Math.min(baseScore + bonus, 100);

    db.transaction(() => {
      db.prepare(`UPDATE leads SET
        lead_score=?,
        lead_status=CASE WHEN lead_status='new' THEN 'researched' ELSE lead_status END,
        updated_at=?
        WHERE id=?`).run(newScore, new Date().toISOString(), leadId);
      db.prepare("INSERT INTO activities (lead_id, user, activity_type, description) VALUES (?, 'system', 'research_completed', ?)").run(
        leadId, `Research report generated (Readiness Score: ${reportData.readiness_score}/100)`
      );
    })();

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
  const name = lead.business_name;
  return {
    summary: `${name} is a ${category} in Jacksonville, FL. Configure your Anthropic API key to generate AI-powered research reports.`,
    readiness_score: lead.lead_score || 50,
    estimated_revenue: 'Configure API keys to estimate',
    estimated_deal_size: 'Configure API keys to estimate',
    business_overview: {
      web_presence_quality: lead.website ? 'Has website' : 'No website found',
      reputation_summary: 'Requires Google Search API key to assess',
    },
    business_specific_findings: `Limited data available for ${name} without API keys configured.`,
    local_context: `Jacksonville FL has a competitive ${category} market. AI receptionist services can differentiate businesses that handle calls reliably.`,
    specific_pain_signals: `${category} businesses typically miss calls during peak hours and after hours.`,
    competition_context: `Local competition in Jacksonville's ${category} sector means fast phone response is critical for capturing leads.`,
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
    recommended_approach: `Lead with the missed-call pain point for ${name}. Ask how many calls they miss per week. Offer a free trial.`,
    call_script_starter: `Hi, is this ${name}? Great — I'm calling from NESVR. We help ${category} businesses in Jacksonville stop losing customers to unanswered phones. Do you have 60 seconds?`,
    email_subject: `Stop missing calls — ${name}`,
    email_body: `Hi there,\n\nI help ${category} businesses like ${name} in Jacksonville never miss another customer call with an AI receptionist that handles calls 24/7.\n\nWould you be open to a quick 10-minute demo this week?\n\n— NESVR Team`,
    sources_used: [],
    sources_searched: [],
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
    try {
      for (const id of leadIds) {
        queueState.current = id;
        try {
          await runResearch(id);
          queueState.completed++;
        } catch (err) {
          queueState.errors.push({ id, error: err.message });
          queueState.completed++;
        }
        if (queueState.queue.indexOf(id) < queueState.queue.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } finally {
      queueState.running = false;
      queueState.current = null;
    }
  })().catch(err => {
    console.error('[research] queue fatal error:', err.message);
  });

  return { started: true, total: leadIds.length };
}

function getQueueStatus() {
  return { ...queueState };
}

module.exports = { runResearch, runQueue, getQueueStatus };

const Anthropic = require('@anthropic-ai/sdk');

const TEMPLATES = {
  cold_intro: {
    name: 'Cold Intro — AI Receptionist',
    subject: 'Never miss another customer call — {company_name}',
    body: `Hi {first_name},

I help {category} businesses in Jacksonville stop losing customers to unanswered phones.

Our AI receptionist handles calls 24/7, books appointments, and never puts anyone on hold — for less than the cost of a part-time employee.

Would you be open to a quick 10-minute demo this week?

Best,
NESVR Team`,
  },
  followup_1: {
    name: 'Follow-up #1',
    subject: 'Following up — {company_name}',
    body: `Hi {first_name},

Just circling back on my note from last week about the AI receptionist for {company_name}.

I know you're busy running the business — that's exactly why I thought this might be worth 10 minutes of your time.

Would Thursday or Friday afternoon work for a quick call?

Best,
NESVR Team`,
  },
  followup_2: {
    name: 'Follow-up #2',
    subject: 'Last note — {company_name}',
    body: `Hi {first_name},

I'll keep this short — I don't want to be a pest.

If you're still handling your own phones or using a receptionist, I'd love to show you how we've helped other {category} businesses in Jacksonville cut costs and capture more customers.

If timing isn't right, no worries. Just reply "not now" and I'll check back in a few months.

Best,
NESVR Team`,
  },
  demo_followup: {
    name: 'Demo Follow-up',
    subject: 'Great talking with you — next steps for {company_name}',
    body: `Hi {first_name},

Really enjoyed our call today. Based on what you shared about {company_name}, I think our AI receptionist would be a great fit — especially given {pain_point}.

I'm sending over the proposal shortly. Let me know if you have any questions before we get started.

Looking forward to working with you,
NESVR Team`,
  },
};

function applyMergeTags(text, lead) {
  const firstName = (lead.business_name || '').split(' ')[0];
  const city = lead.city || 'Jacksonville';
  const category = lead.category || 'your business';
  const painPoint = lead.category
    ? `the challenges ${category} businesses face with phone handling`
    : 'your phone handling challenges';

  return text
    .replace(/{first_name}/g, firstName)
    .replace(/{company_name}/g, lead.business_name || '')
    .replace(/{category}/g, category)
    .replace(/{city}/g, city)
    .replace(/{pain_point}/g, painPoint);
}

async function generateAIEmail(lead, report, templateName) {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Return template with merge tags applied
    const template = TEMPLATES[templateName] || TEMPLATES.cold_intro;
    return {
      subject: applyMergeTags(template.subject, lead),
      body: applyMergeTags(template.body, lead),
      aiGenerated: false,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const reportContext = report
    ? `Key findings: ${JSON.parse(report.key_findings || '[]').join(', ')}
Pain points: ${JSON.parse(report.phone_pain_points || '[]').join(', ')}
Recommended approach: ${report.recommended_approach || ''}`
    : 'No research report available — write based on business category.';

  const prompt = `Write a personalized cold sales email for this business:

Business: ${lead.business_name}
Category: ${lead.category || 'Unknown'}
City: ${lead.city || 'Jacksonville'}, FL
Phone: ${lead.phone || 'Unknown'}

Research Intelligence:
${reportContext}

Write a 3-4 sentence cold email from NESVR (an AI phone receptionist reseller). Be specific, mention their industry, and reference a real pain point. Keep it conversational, not corporate. Do not use buzzwords.

Return JSON: {"subject": "...", "body": "..."}
Return ONLY the JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const result = JSON.parse(raw);
    return { ...result, aiGenerated: true };
  } catch (err) {
    const template = TEMPLATES[templateName] || TEMPLATES.cold_intro;
    return {
      subject: applyMergeTags(template.subject, lead),
      body: applyMergeTags(template.body, lead),
      aiGenerated: false,
      error: err.message,
    };
  }
}

module.exports = { TEMPLATES, applyMergeTags, generateAIEmail };

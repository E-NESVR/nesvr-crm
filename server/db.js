const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const DB_PATH = path.join(__dirname, '..', 'nesvr.db');
const CSV_PATH = path.join(__dirname, '..', 'data', 'leads.csv');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function calculateLeadScore(lead) {
  let score = 0;
  if (lead.phone) score += 20;
  if (lead.email) score += 20;
  if (lead.website) score += 15;
  if (lead.address) score += 15;
  if (lead.business_name) score += 10;
  if (lead.category) score += 10;
  if (lead.contact_quality === 'Complete') score += 10;
  return Math.min(score, 100);
}

function mapCsvStatus(status) {
  if (!status) return 'new';
  const s = status.toLowerCase();
  if (s.includes("haven't called") || s === '') return 'new';
  if (s.includes('contacted') || s.includes('called')) return 'contacted';
  if (s.includes('no answer')) return 'no_answer';
  if (s.includes('demo') || s.includes('appointment')) return 'demo_booked';
  if (s.includes('closed') || s.includes('won')) return 'closed_won';
  if (s.includes('cold') || s.includes('not interested')) return 'cold';
  return 'new';
}

function initDB() {
  const database = getDB();

  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      category TEXT,
      priority_tier TEXT,
      contact_quality TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      address TEXT,
      city TEXT,
      state TEXT DEFAULT 'FL',
      linkedin TEXT,
      estimated_revenue TEXT,
      company_size TEXT,
      lead_score INTEGER DEFAULT 0,
      lead_status TEXT DEFAULT 'new',
      lead_type TEXT DEFAULT 'cold',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS research_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      status TEXT DEFAULT 'pending',
      content_json TEXT,
      summary TEXT,
      readiness_score INTEGER,
      key_findings TEXT,
      recommended_approach TEXT,
      phone_pain_points TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      enrichment_sources TEXT
    );

    CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      logged_by TEXT NOT NULL,
      call_date DATE NOT NULL,
      outcome TEXT,
      duration_minutes INTEGER,
      follow_up_needed INTEGER DEFAULT 0,
      follow_up_date DATE,
      recording_link TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      user TEXT NOT NULL,
      activity_type TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      created_by TEXT,
      subject TEXT,
      body TEXT,
      template_used TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dashboard_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_key TEXT UNIQUE,
      metric_value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
    CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
    CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(priority_tier);
    CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);
    CREATE INDEX IF NOT EXISTS idx_leads_business_name ON leads(business_name);
    CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
    CREATE INDEX IF NOT EXISTS idx_activities_lead_date ON activities(lead_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);
    CREATE INDEX IF NOT EXISTS idx_call_logs_followup ON call_logs(follow_up_needed, follow_up_date);
    CREATE INDEX IF NOT EXISTS idx_research_lead ON research_reports(lead_id);
    CREATE INDEX IF NOT EXISTS idx_research_lead_date ON research_reports(lead_id, created_at);
  `);

  // Migrations: add soft-delete columns if they don't exist yet
  runMigrations(database);

  // Import CSV if leads table is empty
  const count = database.prepare('SELECT COUNT(*) as cnt FROM leads WHERE deleted_at IS NULL').get();
  if (count.cnt === 0) {
    importCSV(database);
  }

  return database;
}

function importCSV(database) {
  if (!fs.existsSync(CSV_PATH)) {
    console.log('[DB] No leads.csv found at', CSV_PATH, '— skipping import');
    return;
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  let records;
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    console.error('[DB] Failed to parse CSV:', err.message);
    return;
  }

  const insert = database.prepare(`
    INSERT INTO leads (
      business_name, category, priority_tier, contact_quality,
      phone, lead_status, lead_score, notes, lead_type, created_at, updated_at
    ) VALUES (
      @business_name, @category, @priority_tier, @contact_quality,
      @phone, @lead_status, @lead_score, @notes, @lead_type, @created_at, @updated_at
    )
  `);

  const insertMany = database.transaction((rows) => {
    for (const row of rows) {
      const lead = {
        business_name: row['Business Name'] || 'Unknown',
        category: row['Category'] || null,
        priority_tier: row['Priority Tier'] || null,
        contact_quality: row['Contact Quality'] || null,
        phone: row['Phone Number'] || null,
        lead_status: mapCsvStatus(row['Status']),
        notes: row['Notes'] || null,
        lead_type: 'cold',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      lead.lead_score = calculateLeadScore(lead);
      insert.run(lead);
    }
  });

  try {
    insertMany(records);
    console.log(`[DB] Imported ${records.length} leads from CSV`);
  } catch (err) {
    console.error('[DB] CSV import error:', err.message);
  }
}

function runMigrations(database) {
  // Helper: check if a column exists on a table
  const hasColumn = (table, col) => {
    const info = database.prepare(`PRAGMA table_info(${table})`).all();
    return info.some(c => c.name === col);
  };

  // Soft-delete columns for leads
  if (!hasColumn('leads', 'deleted_at')) {
    database.exec('ALTER TABLE leads ADD COLUMN deleted_at DATETIME');
    console.log('[DB] Migration: added deleted_at to leads');
  }
  if (!hasColumn('leads', 'deleted_by')) {
    database.exec('ALTER TABLE leads ADD COLUMN deleted_by TEXT');
  }
  if (!hasColumn('leads', 'delete_reason')) {
    database.exec('ALTER TABLE leads ADD COLUMN delete_reason TEXT');
  }

  // Soft-delete columns for call_logs
  if (!hasColumn('call_logs', 'deleted_at')) {
    database.exec('ALTER TABLE call_logs ADD COLUMN deleted_at DATETIME');
    console.log('[DB] Migration: added deleted_at to call_logs');
  }
  if (!hasColumn('call_logs', 'deleted_by')) {
    database.exec('ALTER TABLE call_logs ADD COLUMN deleted_by TEXT');
  }
  if (!hasColumn('call_logs', 'delete_reason')) {
    database.exec('ALTER TABLE call_logs ADD COLUMN delete_reason TEXT');
  }

  // Soft-delete columns for research_reports
  if (!hasColumn('research_reports', 'deleted_at')) {
    database.exec('ALTER TABLE research_reports ADD COLUMN deleted_at DATETIME');
    console.log('[DB] Migration: added deleted_at to research_reports');
  }
  if (!hasColumn('research_reports', 'deleted_by')) {
    database.exec('ALTER TABLE research_reports ADD COLUMN deleted_by TEXT');
  }
  if (!hasColumn('research_reports', 'delete_reason')) {
    database.exec('ALTER TABLE research_reports ADD COLUMN delete_reason TEXT');
  }

  // Deal value tracking
  if (!hasColumn('leads', 'deal_value')) {
    database.exec('ALTER TABLE leads ADD COLUMN deal_value INTEGER DEFAULT 0');
    console.log('[DB] Migration: added deal_value to leads');
  }
}

module.exports = { getDB, initDB, calculateLeadScore };

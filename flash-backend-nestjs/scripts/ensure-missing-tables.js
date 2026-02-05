require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const statements = [
  {
    name: 'clients.industry_id -> integer',
    sql: "ALTER TABLE clients ALTER COLUMN industry_id TYPE integer USING NULLIF(industry_id, '')::integer",
  },
  {
    name: 'vehicle_assignments',
    sql: `CREATE TABLE IF NOT EXISTS vehicle_assignments (
      id SERIAL PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      employee_id TEXT,
      from_date TEXT,
      to_date TEXT,
      assignment_date TEXT,
      route TEXT,
      location TEXT,
      purpose TEXT,
      distance_km REAL,
      cost REAL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: 'fuel_entries',
    sql: `CREATE TABLE IF NOT EXISTS fuel_entries (
      id SERIAL PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      fuel_type TEXT,
      liters REAL NOT NULL,
      price_per_liter REAL,
      total_cost REAL NOT NULL,
      odometer_km INTEGER,
      vendor TEXT,
      location TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: 'vehicle_maintenance',
    sql: `CREATE TABLE IF NOT EXISTS vehicle_maintenance (
      id SERIAL PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      maintenance_date TEXT NOT NULL,
      maintenance_type TEXT,
      description TEXT NOT NULL,
      cost REAL,
      vendor TEXT,
      odometer_reading INTEGER,
      status TEXT DEFAULT 'completed',
      notes TEXT,
      next_maintenance_date TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: 'employee_advances',
    sql: `CREATE TABLE IF NOT EXISTS employee_advances (
      id SERIAL PRIMARY KEY,
      employee_db_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      advance_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: 'employee_advance_deductions',
    sql: `CREATE TABLE IF NOT EXISTS employee_advance_deductions (
      id SERIAL PRIMARY KEY,
      employee_db_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: 'finance_journal_lines',
    sql: `CREATE TABLE IF NOT EXISTS finance_journal_lines (
      id SERIAL PRIMARY KEY,
      entry_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  },
  {
    name: 'finance_journal_lines.account_id',
    sql: 'ALTER TABLE finance_journal_lines ADD COLUMN IF NOT EXISTS account_id INTEGER',
  },
];

async function run() {
  try {
    await client.connect();
    for (const stmt of statements) {
      try {
        await client.query(stmt.sql);
        console.log(`OK: ${stmt.name}`);
      } catch (err) {
        console.error(`ERROR: ${stmt.name} - ${err.message || err}`);
      }
    }
  } catch (err) {
    console.error(err.message || err);
  } finally {
    await client.end();
  }
}

run();

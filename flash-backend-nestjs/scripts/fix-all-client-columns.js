const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addAllMissingColumns() {
  const client = await pool.connect();

  try {
    const operations = [
      // clients table
      { name: 'clients.client_id', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_id TEXT UNIQUE` },
      { name: 'clients.company_name', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name TEXT` },
      { name: 'clients.email', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT` },
      { name: 'clients.phone', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT` },
      { name: 'clients.address', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT` },
      { name: 'clients.industry', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT` },
      { name: 'clients.industry_id', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry_id INTEGER` },
      { name: 'clients.status', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'` },
      { name: 'clients.notes', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT` },
      { name: 'clients.created_at', sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()` },

      // client_addresses table
      { name: 'client_addresses.address_line1', sql: `ALTER TABLE client_addresses ADD COLUMN IF NOT EXISTS address_line1 TEXT` },
      { name: 'client_addresses.address_line2', sql: `ALTER TABLE client_addresses ADD COLUMN IF NOT EXISTS address_line2 TEXT` },
      { name: 'client_addresses.city', sql: `ALTER TABLE client_addresses ADD COLUMN IF NOT EXISTS city TEXT` },
      { name: 'client_addresses.state', sql: `ALTER TABLE client_addresses ADD COLUMN IF NOT EXISTS state TEXT` },
      { name: 'client_addresses.postal_code', sql: `ALTER TABLE client_addresses ADD COLUMN IF NOT EXISTS postal_code TEXT` },
      { name: 'client_addresses.address_type', sql: `ALTER TABLE client_addresses ADD COLUMN IF NOT EXISTS address_type TEXT` },
      { name: 'client_addresses.created_at', sql: `ALTER TABLE client_addresses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()` },

      // client_sites table
      { name: 'client_sites.name', sql: `ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS name TEXT` },
      { name: 'client_sites.address', sql: `ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS address TEXT` },
      { name: 'client_sites.city', sql: `ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS city TEXT` },
      { name: 'client_sites.guards_required', sql: `ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS guards_required INTEGER DEFAULT 0` },
      { name: 'client_sites.status', sql: `ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'` },
      { name: 'client_sites.created_at', sql: `ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()` },

      // client_contract_documents table
      { name: 'client_contract_documents.filename', sql: `ALTER TABLE client_contract_documents ADD COLUMN IF NOT EXISTS filename TEXT` },
      { name: 'client_contract_documents.file_path', sql: `ALTER TABLE client_contract_documents ADD COLUMN IF NOT EXISTS file_path TEXT` },
      { name: 'client_contract_documents.file_type', sql: `ALTER TABLE client_contract_documents ADD COLUMN IF NOT EXISTS file_type TEXT` },
      { name: 'client_contract_documents.file_size', sql: `ALTER TABLE client_contract_documents ADD COLUMN IF NOT EXISTS file_size INTEGER` },
      { name: 'client_contract_documents.uploaded_at', sql: `ALTER TABLE client_contract_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT now()` },

      // site_guard_assignments table
      { name: 'site_guard_assignments.employee_id', sql: `ALTER TABLE site_guard_assignments ADD COLUMN IF NOT EXISTS employee_id TEXT` },
      { name: 'site_guard_assignments.assignment_date', sql: `ALTER TABLE site_guard_assignments ADD COLUMN IF NOT EXISTS assignment_date TEXT` },
      { name: 'site_guard_assignments.end_date', sql: `ALTER TABLE site_guard_assignments ADD COLUMN IF NOT EXISTS end_date TEXT` },
      { name: 'site_guard_assignments.shift', sql: `ALTER TABLE site_guard_assignments ADD COLUMN IF NOT EXISTS shift TEXT` },
      { name: 'site_guard_assignments.status', sql: `ALTER TABLE site_guard_assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'` },
      { name: 'site_guard_assignments.notes', sql: `ALTER TABLE site_guard_assignments ADD COLUMN IF NOT EXISTS notes TEXT` },
      { name: 'site_guard_assignments.created_at', sql: `ALTER TABLE site_guard_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()` },
    ];

    for (const op of operations) {
      try {
        await client.query(op.sql);
        console.log(`OK: ${op.name}`);
      } catch (err) {
        console.log(`SKIP: ${op.name} - ${err.message}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

addAllMissingColumns().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addMissingColumns() {
  const client = await pool.connect();

  try {
    const operations = [
      // client_contacts columns
      {
        name: 'client_contacts.email',
        sql: `ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS email TEXT`,
      },
      {
        name: 'client_contacts.phone',
        sql: `ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS phone TEXT`,
      },
      {
        name: 'client_contacts.role',
        sql: `ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS role TEXT`,
      },
      {
        name: 'client_contacts.is_primary',
        sql: `ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false`,
      },
      {
        name: 'client_contacts.created_at',
        sql: `ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()`,
      },
      // client_contracts columns
      {
        name: 'client_contracts.contract_number',
        sql: `ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS contract_number TEXT`,
      },
      {
        name: 'client_contracts.start_date',
        sql: `ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS start_date TEXT`,
      },
      {
        name: 'client_contracts.end_date',
        sql: `ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS end_date TEXT`,
      },
      {
        name: 'client_contracts.value',
        sql: `ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS value REAL`,
      },
      {
        name: 'client_contracts.status',
        sql: `ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`,
      },
      {
        name: 'client_contracts.terms',
        sql: `ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS terms TEXT`,
      },
      {
        name: 'client_contracts.created_at',
        sql: `ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()`,
      },
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

addMissingColumns().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addMissingColumns() {
  const client = await pool.connect();

  try {
    const operations = [
      {
        name: 'client_contacts.email',
        sql: `ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS email TEXT`,
      },
      {
        name: 'client_contracts.contract_number',
        sql: `ALTER TABLE client_contracts ADD COLUMN IF NOT EXISTS contract_number TEXT`,
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

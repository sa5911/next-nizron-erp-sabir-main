require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    await client.query(
      "UPDATE clients SET industry_id = NULL WHERE industry_id IS NOT NULL AND TRIM(industry_id::text) !~ '^[0-9]+$'",
    );
    await client.query(
      "ALTER TABLE clients ALTER COLUMN industry_id TYPE integer USING NULLIF(TRIM(industry_id::text), '')::integer",
    );
    console.log('Updated clients.industry_id to integer');
  } catch (err) {
    console.error(err.message || err);
  } finally {
    await client.end();
  }
}

run();

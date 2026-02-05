require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'industry_id'",
    );
    const res2 = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'industries' AND column_name = 'id'",
    );
    console.log('clients.industry_id:', res.rows);
    console.log('industries.id:', res2.rows);
  } catch (err) {
    console.error(err.message || err);
  } finally {
    await client.end();
  }
}

run();

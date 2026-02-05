import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const email = process.argv[2];
const newId = Number(process.argv[3]);

if (!email || Number.isNaN(newId)) {
  console.error('Usage: ts-node src/db/set-user-id.ts <email> <id>');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query(
      'UPDATE "users" SET id = $1 WHERE email = $2 RETURNING id, email',
      [newId, email],
    );

    if (res.rowCount === 0) {
      console.error('No user found with that email');
      process.exit(1);
    }

    console.log(`Updated user ${res.rows[0].email} to id ${res.rows[0].id}`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

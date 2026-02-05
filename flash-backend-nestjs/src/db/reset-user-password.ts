import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';

dotenv.config();

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: ts-node src/db/reset-user-password.ts <email> <password>');
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
    const hashed = await bcrypt.hash(newPassword, 10);

    const result = await client.query(
      'UPDATE users SET password = $1, is_admin = true, is_active = true WHERE email = $2 RETURNING id, email',
      [hashed, email],
    );

    if (result.rowCount === 0) {
      console.error('No user found with that email');
      process.exit(1);
    }

    console.log(`Password reset for ${result.rows[0].email} (id ${result.rows[0].id})`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

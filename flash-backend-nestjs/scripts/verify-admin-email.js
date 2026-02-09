require('dotenv').config();
const { Client } = require('pg');

async function verifyAdminEmail() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(
      `SELECT id, email, is_admin FROM users WHERE is_admin = true OR email LIKE '%admin%' LIMIT 5`
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin users in database:');
      result.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Email: ${row.email}, Is Admin: ${row.is_admin}`);
      });
    } else {
      console.log('❌ No admin users found');
    }
  } catch (error) {
    console.error('Error verifying admin email:', error);
  } finally {
    await client.end();
  }
}

verifyAdminEmail();

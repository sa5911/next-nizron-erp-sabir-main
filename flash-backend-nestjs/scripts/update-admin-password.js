const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateAdminPassword() {
  const client = await pool.connect();

  try {
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await client.query(
      `UPDATE users SET password = $1, is_admin = true WHERE email = $2 RETURNING id, email`,
      [hashedPassword, 'admin@nizron.com']
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully');
      console.log('Email: admin@nizron.com');
      console.log('Password: password123');
    } else {
      console.log('❌ Admin user not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAdminPassword();

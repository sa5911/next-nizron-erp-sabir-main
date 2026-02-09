require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function updateAdminEmail() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // First, update the email address
    const emailResult = await client.query(
      `UPDATE users SET email = $1 WHERE email = $2 RETURNING id, email`,
      ['admin@nizron.com', 'admin@flash.com']
    );

    if (emailResult.rows.length > 0) {
      console.log('✅ Admin email updated successfully');
      console.log('Old email: admin@flash.com');
      console.log('New email: admin@nizron.com');
    } else {
      console.log('❌ Admin user with email admin@flash.com not found');
    }
  } catch (error) {
    console.error('Error updating admin email:', error);
  } finally {
    await client.end();
  }
}

updateAdminEmail();

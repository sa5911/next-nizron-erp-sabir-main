const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateAllEmployeePasswords() {
  const client = await pool.connect();

  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await client.query(
      `UPDATE employees SET password = $1 WHERE password IS NOT NULL RETURNING id, employee_id, first_name, last_name`,
      [hashedPassword]
    );

    console.log(`✅ Updated ${result.rows.length} employee passwords`);
    console.log('New password for all employees: admin123');
    console.log('\nUpdated employees:');
    result.rows.forEach(emp => {
      console.log(`- ${emp.first_name} ${emp.last_name} (ID: ${emp.employee_id})`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAllEmployeePasswords();

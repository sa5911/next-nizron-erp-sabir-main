import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAllColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const tables = [
      'general_inventory_items'
    ];
    
    for (const table of tables) {
        const res = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = '${table}';
        `);
        console.log(`Columns in ${table}:`);
        res.rows.forEach(row => console.log(` - ${row.column_name} (${row.data_type})`));
        console.log('---');
    }
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await client.end();
  }
}

checkAllColumns();

import * as fs from 'fs';
import { Client } from 'pg';

const connectionString = 'postgresql://postgres.kndwpdugnkzkqubfrybb:u9YXo25kKC53qEyx@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';

const exportData = JSON.parse(
  fs.readFileSync('exports/database-export-anonymized-1770326477913.json', 'utf8')
);

async function recreateEmployeesTable() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('🔄 Recreating employees table with all columns...\n');

    const rows = exportData.tables.employees;
    if (rows.length === 0) {
      console.log('No employees to import');
      return;
    }

    const sample = rows[0];
    const columns = Object.entries(sample).map(([col, value]) => {
      let type = 'TEXT';
      if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
      } else if (typeof value === 'boolean') {
        type = 'BOOLEAN';
      }
      return `"${col}" ${type}`;
    });

    const createTableSQL = `
      DROP TABLE IF EXISTS public.employees CASCADE;
      CREATE TABLE public.employees (
        ${columns.join(',\n        ')}
      );
    `;

    await client.query(createTableSQL);
    console.log(`✓ Recreated employees table with ${columns.length} columns`);

    console.log('\nColumns created:');
    Object.keys(sample).forEach((col) => console.log(`  - "${col}"`));
    
    console.log('\n✅ Employees table recreation complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

recreateEmployeesTable();

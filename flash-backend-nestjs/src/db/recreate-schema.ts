import * as fs from 'fs';
import { Client } from 'pg';

const connectionString = 'postgresql://postgres.kndwpdugnkzkqubfrybb:u9YXo25kKC53qEyx@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';

const exportData = JSON.parse(
  fs.readFileSync('exports/database-export-anonymized-1770326477913.json', 'utf8')
);

async function analyzeAndFix() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('📊 Analyzing schema requirements...\n');

    // For each table in the export, drop and recreate it
    const tablesToRecreate = Object.entries(exportData.tables)
      .filter(([, rows]: [string, any[]]) => rows.length > 0)
      .map(([table]) => table);

    console.log(`Found ${tablesToRecreate.length} tables to recreate:\n`);

    for (const table of tablesToRecreate) {
      const rows = exportData.tables[table];
      if (rows.length === 0) continue;

      const sample = rows[0];
      const columns = Object.entries(sample).map(([col, value]) => {
        let type = 'TEXT';
        if (typeof value === 'number') {
          type = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
        } else if (typeof value === 'boolean') {
          type = 'BOOLEAN';
        } else if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          type = 'TIMESTAMP';
        }
        return `${col} ${type}`;
      });

      const createTableSQL = `
        DROP TABLE IF EXISTS public."${table}" CASCADE;
        CREATE TABLE IF NOT EXISTS public."${table}" (
          ${columns.join(',\n          ')}
        );
      `;

      try {
        await client.query(createTableSQL);
        console.log(`✓ Recreated table: ${table} (${rows.length} rows)`);
      } catch (error) {
        console.log(`❌ Error recreating ${table}:`, error.message.split('\n')[0]);
      }
    }

    console.log('\n✅ Schema recreation complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

analyzeAndFix();

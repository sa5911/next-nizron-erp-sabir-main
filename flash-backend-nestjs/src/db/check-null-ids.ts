import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkAllTablesForNullIds() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    console.log('Checking all tables for NULL IDs...\n');

    // Get all tables with an 'id' column
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.columns
      WHERE column_name = 'id' 
        AND table_schema = 'public'
        AND table_name NOT LIKE '%backup%'
      ORDER BY table_name;
    `);

    const issues: any[] = [];

    for (const row of tablesResult.rows) {
      const table = row.table_name;
      
      // Check for NULL IDs
      const nullCheck = await client.query(`
        SELECT COUNT(*) as total, COUNT(id) as with_id
        FROM ${table};
      `);

      const total = parseInt(nullCheck.rows[0].total);
      const withId = parseInt(nullCheck.rows[0].with_id);
      const nullIds = total - withId;

      if (nullIds > 0) {
        console.log(`⚠️  ${table}: ${nullIds} records with NULL ID (${withId} valid, ${total} total)`);
        issues.push({ table, nullIds, total });
      } else if (total > 0) {
        console.log(`✓ ${table}: All ${total} records have valid IDs`);
      }
    }

    console.log('\n======================================');
    console.log('SUMMARY');
    console.log('======================================\n');

    if (issues.length === 0) {
      console.log('✓ No tables with NULL ID issues found!');
    } else {
      console.log(`⚠️  Found ${issues.length} table(s) with NULL ID issues:\n`);
      issues.forEach(issue => {
        console.log(`  - ${issue.table}: ${issue.nullIds} NULL IDs out of ${issue.total} records`);
      });
      console.log('\n⚠️  These tables need to be fixed!');
    }

  } catch (err) {
    console.error('\n✗ Check failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAllTablesForNullIds();

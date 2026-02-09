import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface TableFix {
  table: string;
  sequenceName: string;
  orderByColumn?: string;
}

async function fixAllNullIds() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Tables that need fixing based on the check
    const tablesToFix: TableFix[] = [
      { table: 'attendance', sequenceName: 'attendance_id_seq', orderByColumn: 'date' },
      { table: 'employees', sequenceName: 'employees_id_seq', orderByColumn: 'employee_id' },
      { table: 'vehicle_categories', sequenceName: 'vehicle_categories_id_seq', orderByColumn: 'name' },
      { table: 'vehicle_types', sequenceName: 'vehicle_types_id_seq', orderByColumn: 'name' },
      { table: 'vehicles', sequenceName: 'vehicles_id_seq', orderByColumn: 'vehicle_id' },
    ];

    for (const tableFix of tablesToFix) {
      console.log(`\n======================================`);
      console.log(`Fixing ${tableFix.table}...`);
      console.log(`======================================\n`);

      // Check current state
      const countCheck = await client.query(`
        SELECT COUNT(*) as total, COUNT(id) as with_id FROM ${tableFix.table};
      `);
      
      const total = parseInt(countCheck.rows[0].total);
      const withId = parseInt(countCheck.rows[0].with_id);
      const nullIds = total - withId;

      if (nullIds === 0) {
        console.log(`✓ No NULL IDs in ${tableFix.table}, skipping.`);
        continue;
      }

      console.log(`Found ${nullIds} NULL IDs out of ${total} records\n`);

      // Create backup
      const backupName = `${tableFix.table}_backup_${Date.now()}`;
      await client.query(`CREATE TABLE ${backupName} AS SELECT * FROM ${tableFix.table};`);
      console.log(`✓ Created backup: ${backupName}\n`);

      // Start transaction
      await client.query('BEGIN');

      try {
        // Get all data
        const orderBy = tableFix.orderByColumn || 'created_at';
        const allData = await client.query(`
          SELECT * FROM ${tableFix.table} 
          ORDER BY ${orderBy} NULLS LAST;
        `);

        if (allData.rows.length === 0) {
          console.log(`✓ ${tableFix.table} is empty, skipping.`);
          await client.query('ROLLBACK');
          continue;
        }

        // Delete all records
        await client.query(`DELETE FROM ${tableFix.table};`);

        // Check/create sequence
        const seqCheck = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = $1
          ) as exists;
        `, [tableFix.sequenceName]);

        if (!seqCheck.rows[0].exists) {
          console.log(`Creating sequence ${tableFix.sequenceName}...`);
          await client.query(`CREATE SEQUENCE ${tableFix.sequenceName};`);
          await client.query(`
            ALTER TABLE ${tableFix.table} 
            ALTER COLUMN id SET DEFAULT nextval('${tableFix.sequenceName}');
          `);
          await client.query(`
            ALTER SEQUENCE ${tableFix.sequenceName} OWNED BY ${tableFix.table}.id;
          `);
        }

        // Reset sequence
        await client.query(`ALTER SEQUENCE ${tableFix.sequenceName} RESTART WITH 1;`);

        // Get actual columns that exist in the table (once, outside the loop)
        const columnsResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name != 'id'
          ORDER BY ordinal_position;
        `, [tableFix.table]);
        
        const tableColumns = new Set(columnsResult.rows.map(r => r.column_name));

        // Re-insert all records to get new sequential IDs
        for (const row of allData.rows) {
          // Build column list and values from row, only using columns that exist in table
          const columns: string[] = [];
          const values: any[] = [];
          
          // Iterate through all properties in the row
          for (const [key, value] of Object.entries(row)) {
            // Skip id column and only include columns that exist in the table
            if (key !== 'id' && tableColumns.has(key)) {
              columns.push(key);
              values.push(value);
            }
          }
          
          if (columns.length === 0) {
            console.log(`⚠️  Skipping row with no valid columns`);
            continue;
          }
          
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          await client.query(`
            INSERT INTO ${tableFix.table} (${columns.join(', ')})
            VALUES (${placeholders})
          `, values);
        }

        await client.query('COMMIT');
        console.log(`✓ Fixed ${allData.rows.length} records in ${tableFix.table}`);

        // Verify fix
        const verifyCheck = await client.query(`
          SELECT COUNT(*) as total, COUNT(id) as with_id FROM ${tableFix.table};
        `);
        const newTotal = parseInt(verifyCheck.rows[0].total);
        const newWithId = parseInt(verifyCheck.rows[0].with_id);
        
        if (newTotal === newWithId) {
          console.log(`✓ Verification passed: All ${newTotal} records have valid IDs`);
        } else {
          console.log(`⚠️  Verification issue: ${newWithId} valid IDs out of ${newTotal}`);
        }

      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed to fix ${tableFix.table}:`, err instanceof Error ? err.message : err);
        console.log(`Continuing with next table...\n`);
        // Don't throw, continue with next table
      }
    }

    console.log('\n======================================');
    console.log('ALL TABLES FIXED');
    console.log('======================================\n');

    // Final verification
    console.log('Running final verification...\n');
    for (const tableFix of tablesToFix) {
      const finalCheck = await client.query(`
        SELECT COUNT(*) as total, COUNT(id) as with_id FROM ${tableFix.table};
      `);
      const total = parseInt(finalCheck.rows[0].total);
      const withId = parseInt(finalCheck.rows[0].with_id);
      
      if (total === withId && total > 0) {
        console.log(`✓ ${tableFix.table}: ${total} records, all with valid IDs`);
      } else if (total === 0) {
        console.log(`○ ${tableFix.table}: empty`);
      } else {
        console.log(`⚠️  ${tableFix.table}: ${withId}/${total} with valid IDs`);
      }
    }

    console.log('\n✓ Fix complete!');

  } catch (err) {
    console.error('\n✗ Fix failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixAllNullIds();

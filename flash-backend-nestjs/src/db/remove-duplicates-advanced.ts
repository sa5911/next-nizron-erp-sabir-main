import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface DuplicateCheck {
  table: string;
  uniqueColumn: string;
  description: string;
}

async function removeDuplicatesAdvanced() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Tables with unique constraints to check for duplicates
    const duplicateChecks: DuplicateCheck[] = [
      { table: 'users', uniqueColumn: 'email', description: 'User emails' },
      { table: 'permissions', uniqueColumn: 'name', description: 'Permission names' },
      { table: 'roles', uniqueColumn: 'name', description: 'Role names' },
      { table: 'vehicles', uniqueColumn: 'vehicle_id', description: 'Vehicle IDs' },
      { table: 'expenses', uniqueColumn: 'expense_id', description: 'Expense IDs' },
      { table: 'finance_journal_entries', uniqueColumn: 'entry_no', description: 'Journal entry numbers' },
      { table: 'general_inventory_items', uniqueColumn: 'item_code', description: 'General inventory item codes' },
      { table: 'invoices', uniqueColumn: 'invoice_id', description: 'Invoice IDs' },
      { table: 'clients', uniqueColumn: 'client_id', description: 'Client IDs' },
      { table: 'restricted_inventory_items', uniqueColumn: 'item_code', description: 'Restricted inventory item codes' },
      { table: 'restricted_serial_units', uniqueColumn: 'serial_number', description: 'Serial numbers' },
      { table: 'employees', uniqueColumn: 'employee_id', description: 'Employee IDs' },
      { table: 'vehicle_categories', uniqueColumn: 'name', description: 'Vehicle category names' },
      { table: 'industries', uniqueColumn: 'name', description: 'Industry names' },
      { table: 'vehicle_types', uniqueColumn: 'name', description: 'Vehicle type names' },
    ];

    let totalDuplicatesRemoved = 0;
    let tablesWithDuplicates = 0;

    console.log('======================================');
    console.log('REMOVING DUPLICATE RECORDS');
    console.log('======================================\n');

    for (const check of duplicateChecks) {
      // Check if table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [check.table]);

      if (!tableExists.rows[0].exists) {
        console.log(`⊘ Table "${check.table}" does not exist, skipping.`);
        continue;
      }

      // Check if column exists
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2
        );
      `, [check.table, check.uniqueColumn]);

      if (!columnExists.rows[0].exists) {
        console.log(`⊘ Column "${check.uniqueColumn}" in table "${check.table}" does not exist, skipping.`);
        continue;
      }

      // Find duplicates (excluding NULL values)
      const duplicatesQuery = `
        SELECT ${check.uniqueColumn}, COUNT(*) as count, ARRAY_AGG(id ORDER BY id) as ids
        FROM ${check.table}
        WHERE ${check.uniqueColumn} IS NOT NULL
          AND id IS NOT NULL
        GROUP BY ${check.uniqueColumn}
        HAVING COUNT(*) > 1
        ORDER BY count DESC;
      `;
      
      const duplicates = await client.query(duplicatesQuery);

      if (duplicates.rows.length > 0) {
        tablesWithDuplicates++;
        console.log(`\n⚠ Found ${duplicates.rows.length} duplicate ${check.description} in "${check.table}"`);
        let deletedCount = 0;
        
        // Show first few duplicates
        const showMax = 5;
        for (let i = 0; i < Math.min(showMax, duplicates.rows.length); i++) {
          const dup = duplicates.rows[i];
          console.log(`  - "${dup[check.uniqueColumn]}": ${dup.count} occurrences (IDs: ${dup.ids.join(', ')})`);
        }
        if (duplicates.rows.length > showMax) {
          console.log(`  ... and ${duplicates.rows.length - showMax} more duplicates`);
        }

        // Remove duplicates one by one, keeping the first (oldest) record
        for (const dup of duplicates.rows) {
          const ids = dup.ids;
          const idsToDelete = ids.slice(1); // Keep the first, delete the rest
          
          if (idsToDelete.length > 0) {
            const deleteQuery = `
              DELETE FROM ${check.table}
              WHERE id = ANY($1::integer[]);
            `;
            
            try {
              const result = await client.query(deleteQuery, [idsToDelete]);
              const deleted = result.rowCount || 0;
              deletedCount += deleted;
            } catch (err: any) {
              console.log(`  ⚠ Could not delete duplicates for "${dup[check.uniqueColumn]}": ${err.message}`);
            }
          }
        }
        
        totalDuplicatesRemoved += deletedCount;
        console.log(`✓ Removed ${deletedCount} duplicate records from "${check.table}"`);
      } else {
        console.log(`✓ No duplicates found in "${check.table}" (${check.description})`);
      }
    }

    console.log('\n======================================');
    console.log('CLEANUP SUMMARY');
    console.log('======================================\n');
    console.log(`Tables with duplicates found: ${tablesWithDuplicates}`);
    console.log(`Total duplicate records removed: ${totalDuplicatesRemoved}`);
    console.log(`\n✓ Database cleanup completed successfully!`);

  } catch (err) {
    console.error('\n✗ Cleanup failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the cleanup
removeDuplicatesAdvanced();

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface DuplicateCheck {
  table: string;
  uniqueColumn: string;
  description: string;
}

async function removeDuplicates() {
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
      { table: 'finance_accounts', uniqueColumn: 'code', description: 'Finance account codes' },
      { table: 'vehicle_categories', uniqueColumn: 'name', description: 'Vehicle category names' },
      { table: 'industries', uniqueColumn: 'name', description: 'Industry names' },
      { table: 'vehicle_types', uniqueColumn: 'name', description: 'Vehicle type names' },
    ];

    let totalDuplicatesRemoved = 0;
    let tablesWithDuplicates = 0;

    console.log('======================================');
    console.log('CHECKING FOR DUPLICATE RECORDS');
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
        SELECT ${check.uniqueColumn}, COUNT(*) as count
        FROM ${check.table}
        WHERE ${check.uniqueColumn} IS NOT NULL
        GROUP BY ${check.uniqueColumn}
        HAVING COUNT(*) > 1
        ORDER BY count DESC;
      `;
      
      const duplicates = await client.query(duplicatesQuery);

      if (duplicates.rows.length > 0) {
        tablesWithDuplicates++;
        console.log(`⚠ Found ${duplicates.rows.length} duplicate ${check.description} in "${check.table}"`);
        
        // Show first few duplicates
        const showMax = 5;
        for (let i = 0; i < Math.min(showMax, duplicates.rows.length); i++) {
          const dup = duplicates.rows[i];
          console.log(`  - "${dup[check.uniqueColumn]}": ${dup.count} occurrences`);
        }
        if (duplicates.rows.length > showMax) {
          console.log(`  ... and ${duplicates.rows.length - showMax} more duplicates`);
        }

        // Remove duplicates, keeping the record with the smallest ID (oldest)
        const deleteQuery = `
          DELETE FROM ${check.table}
          WHERE id NOT IN (
            SELECT MIN(id)
            FROM ${check.table}
            WHERE ${check.uniqueColumn} IS NOT NULL
            GROUP BY ${check.uniqueColumn}
          );
        `;
        
        const result = await client.query(deleteQuery);
        const deletedCount = result.rowCount || 0;
        totalDuplicatesRemoved += deletedCount;
        console.log(`✓ Removed ${deletedCount} duplicate records from "${check.table}"\n`);
      } else {
        console.log(`✓ No duplicates found in "${check.table}" (${check.description})`);
      }
    }

    console.log('\n======================================');
    console.log('CHECKING FOR ORPHAN RECORDS');
    console.log('======================================\n');

    // Check for orphan records in related tables
    const orphanChecks = [
      {
        table: 'general_inventory_transactions',
        childCol: 'item_code',
        parentTable: 'general_inventory_items',
        parentCol: 'item_code',
        description: 'general inventory transactions without parent items'
      },
      {
        table: 'restricted_serial_units',
        childCol: 'item_code',
        parentTable: 'restricted_inventory_items',
        parentCol: 'item_code',
        description: 'restricted serial units without parent items'
      },
      {
        table: 'restricted_transactions',
        childCol: 'item_code',
        parentTable: 'restricted_inventory_items',
        parentCol: 'item_code',
        description: 'restricted transactions without parent items'
      },
      {
        table: 'employee_files',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id',
        description: 'employee files without parent employees'
      },
      {
        table: 'attendance',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id',
        description: 'attendance records without parent employees'
      },
      {
        table: 'leave_periods',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id',
        description: 'leave periods without parent employees'
      },
      {
        table: 'payroll_payment_status',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id',
        description: 'payroll payment statuses without parent employees'
      },
      {
        table: 'employee_advances',
        childCol: 'employee_db_id',
        parentTable: 'employees',
        parentCol: 'id',
        description: 'employee advances without parent employees'
      },
      {
        table: 'employee_advance_deductions',
        childCol: 'employee_db_id',
        parentTable: 'employees',
        parentCol: 'id',
        description: 'employee advance deductions without parent employees'
      },
      {
        table: 'payroll_sheet_entries',
        childCol: 'employee_db_id',
        parentTable: 'employees',
        parentCol: 'id',
        description: 'payroll sheet entries without parent employees'
      },
      {
        table: 'client_contacts',
        childCol: 'client_id',
        parentTable: 'clients',
        parentCol: 'id',
        description: 'client contacts without parent clients'
      },
      {
        table: 'client_addresses',
        childCol: 'client_id',
        parentTable: 'clients',
        parentCol: 'id',
        description: 'client addresses without parent clients'
      },
      {
        table: 'client_sites',
        childCol: 'client_id',
        parentTable: 'clients',
        parentCol: 'id',
        description: 'client sites without parent clients'
      },
      {
        table: 'client_contracts',
        childCol: 'client_id',
        parentTable: 'clients',
        parentCol: 'id',
        description: 'client contracts without parent clients'
      },
      {
        table: 'site_guard_assignments',
        childCol: 'site_id',
        parentTable: 'client_sites',
        parentCol: 'id',
        description: 'site guard assignments without parent sites'
      },
      {
        table: 'vehicle_assignments',
        childCol: 'vehicle_id',
        parentTable: 'vehicles',
        parentCol: 'vehicle_id',
        description: 'vehicle assignments without parent vehicles'
      },
      {
        table: 'vehicle_documents',
        childCol: 'vehicle_id',
        parentTable: 'vehicles',
        parentCol: 'vehicle_id',
        description: 'vehicle documents without parent vehicles'
      },
      {
        table: 'vehicle_images',
        childCol: 'vehicle_id',
        parentTable: 'vehicles',
        parentCol: 'vehicle_id',
        description: 'vehicle images without parent vehicles'
      },
      {
        table: 'vehicle_maintenance',
        childCol: 'vehicle_id',
        parentTable: 'vehicles',
        parentCol: 'vehicle_id',
        description: 'vehicle maintenance records without parent vehicles'
      },
      {
        table: 'fuel_entries',
        childCol: 'vehicle_id',
        parentTable: 'vehicles',
        parentCol: 'vehicle_id',
        description: 'fuel entries without parent vehicles'
      },
      {
        table: 'client_payments',
        childCol: 'invoice_id',
        parentTable: 'invoices',
        parentCol: 'invoice_id',
        description: 'client payments without parent invoices'
      },
      {
        table: 'advances',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id',
        description: 'advances without parent employees'
      },
      {
        table: 'finance_journal_lines',
        childCol: 'entry_id',
        parentTable: 'finance_journal_entries',
        parentCol: 'id',
        description: 'journal lines without parent entries'
      },
      {
        table: 'finance_journal_lines',
        childCol: 'account_id',
        parentTable: 'finance_accounts',
        parentCol: 'id',
        description: 'journal lines without parent accounts'
      },
      {
        table: 'employee_warnings',
        childCol: 'employee_id',
        parentTable: 'employees',
        parentCol: 'employee_id',
        description: 'employee warnings without parent employees'
      },
    ];

    let totalOrphansRemoved = 0;
    let tablesWithOrphans = 0;

    for (const check of orphanChecks) {
      // Check if both tables exist
      const tableCheck = await client.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name IN ($1, $2);
      `, [check.table, check.parentTable]);

      if (parseInt(tableCheck.rows[0].count) < 2) {
        console.log(`⊘ Skipping orphan check for "${check.table}" (one or both tables missing)`);
        continue;
      }

      // Check if columns exist
      const columnCheck = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = $1 AND column_name = $2) as child_col,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = $3 AND column_name = $4) as parent_col;
      `, [check.table, check.childCol, check.parentTable, check.parentCol]);

      if (columnCheck.rows[0].child_col === '0' || columnCheck.rows[0].parent_col === '0') {
        console.log(`⊘ Skipping orphan check for "${check.table}" (column missing)`);
        continue;
      }

      // Check for orphans (excluding NULL values which are valid)
      const orphanCountQuery = `
        SELECT COUNT(*) as count FROM ${check.table} t
        WHERE t.${check.childCol} IS NOT NULL
        AND t.${check.childCol} NOT IN (
          SELECT ${check.parentCol} FROM ${check.parentTable}
          WHERE ${check.parentCol} IS NOT NULL
        );
      `;
      
      const orphans = await client.query(orphanCountQuery);
      const count = parseInt(orphans.rows[0].count);
      
      if (count > 0) {
        tablesWithOrphans++;
        console.log(`⚠ Found ${count} ${check.description}`);
        
        // Delete orphans
        const deleteQuery = `
          DELETE FROM ${check.table} t
          WHERE t.${check.childCol} IS NOT NULL
          AND t.${check.childCol} NOT IN (
            SELECT ${check.parentCol} FROM ${check.parentTable}
            WHERE ${check.parentCol} IS NOT NULL
          );
        `;
        
        await client.query(deleteQuery);
        totalOrphansRemoved += count;
        console.log(`✓ Removed ${count} orphan records from "${check.table}"\n`);
      } else {
        console.log(`✓ No orphans found in "${check.table}"`);
      }
    }

    console.log('\n======================================');
    console.log('CLEANUP SUMMARY');
    console.log('======================================\n');
    console.log(`Tables with duplicates found: ${tablesWithDuplicates}`);
    console.log(`Total duplicate records removed: ${totalDuplicatesRemoved}`);
    console.log(`Tables with orphan records found: ${tablesWithOrphans}`);
    console.log(`Total orphan records removed: ${totalOrphansRemoved}`);
    console.log(`\n✓ Database cleanup completed successfully!`);

  } catch (err) {
    console.error('\n✗ Cleanup failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the cleanup
removeDuplicates();

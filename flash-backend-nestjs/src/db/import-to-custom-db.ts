import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '../db/schema/index';

interface ExportedData {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    totalRecords: number;
    tableCount: number;
  };
}

const tableReferences: Record<string, { schema: any; primaryKeyColumn?: string }> = {
  users: { schema: schema.users },
  permissions: { schema: schema.permissions },
  roles: { schema: schema.roles },
  employees: { schema: schema.employees },
  employee_warnings: { schema: schema.employeeWarnings },
  employee_files: { schema: schema.employeeFiles },
  employee_advances: { schema: schema.employee_advances },
  employee_advance_deductions: { schema: schema.employee_advance_deductions },
  vehicles: { schema: schema.vehicles },
  vehicle_categories: { schema: schema.vehicleCategories },
  vehicle_types: { schema: schema.vehicleTypes },
  vehicle_assignments: { schema: schema.vehicleAssignments },
  vehicle_documents: { schema: schema.vehicleDocuments },
  vehicle_images: { schema: schema.vehicleImages },
  vehicle_maintenance: { schema: schema.vehicleMaintenance },
  fuel_entries: { schema: schema.fuelEntries },
  clients: { schema: schema.clients },
  client_addresses: { schema: schema.client_addresses },
  client_contacts: { schema: schema.client_contacts },
  client_contracts: { schema: schema.client_contracts },
  client_contract_documents: { schema: schema.client_contract_documents },
  client_sites: { schema: schema.client_sites },
  site_guard_assignments: { schema: schema.site_guard_assignments },
  client_payments: { schema: schema.client_payments },
  invoices: { schema: schema.invoices },
  attendance: { schema: schema.attendance },
  advances: { schema: schema.advances },
  leave_periods: { schema: schema.leavePeriods },
  payroll_payment_status: { schema: schema.payrollPaymentStatus },
  payroll_sheet_entries: { schema: schema.payrollSheetEntries },
  finance_accounts: { schema: schema.finance_accounts },
  finance_journal_entries: { schema: schema.finance_journal_entries },
  finance_journal_lines: { schema: schema.finance_journal_lines },
  expenses: { schema: schema.expenses },
  general_inventory_items: { schema: schema.generalInventoryItems },
  general_inventory_transactions: { schema: schema.generalInventoryTransactions },
  restricted_inventory_items: { schema: schema.restrictedInventoryItems },
  restricted_serial_units: { schema: schema.restrictedSerialUnits },
  restricted_transactions: { schema: schema.restrictedTransactions },
  company_settings: { schema: schema.companySettings },
  industries: { schema: schema.industries },
  users_to_roles: { schema: schema.users_to_roles },
  roles_to_permissions: { schema: schema.roles_to_permissions },
};

// Tables that should be imported in a specific order (dependencies first)
const importOrder = [
  'users',
  'permissions',
  'roles',
  'employees',
  'vehicle_categories',
  'vehicle_types',
  'industries',
  'clients',
  'company_settings',
  'vehicles',
  'finance_accounts',
  'finance_journal_entries',
  'users_to_roles',
  'roles_to_permissions',
  'client_addresses',
  'client_contacts',
  'client_contracts',
  'client_sites',
  'client_contract_documents',
  'client_payments',
  'invoices',
  'employee_files',
  'employee_warnings',
  'employee_advances',
  'employee_advance_deductions',
  'vehicle_assignments',
  'vehicle_documents',
  'vehicle_images',
  'vehicle_maintenance',
  'fuel_entries',
  'attendance',
  'advances',
  'leave_periods',
  'payroll_payment_status',
  'payroll_sheet_entries',
  'finance_journal_lines',
  'expenses',
  'general_inventory_items',
  'general_inventory_transactions',
  'restricted_inventory_items',
  'restricted_serial_units',
  'restricted_transactions',
  'site_guard_assignments',
];

async function importDataToCustomDatabase(filepath: string, customDatabaseUrl: string): Promise<void> {
  console.log(`📖 Reading export file: ${filepath}`);

  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }

  const fileContent = fs.readFileSync(filepath, 'utf-8');
  const exportedData: ExportedData = JSON.parse(fileContent);

  console.log(`\n📊 Import Details:`);
  console.log(`   Timestamp: ${exportedData.timestamp}`);
  console.log(`   Total Records: ${exportedData.metadata.totalRecords}`);
  console.log(`   Tables to Import: ${exportedData.metadata.tableCount}`);
  console.log(`\n🔗 Database: ${customDatabaseUrl.split('@')[1]?.split('/')[0] || 'Supabase'}`);

  // Parse connection string to handle sslmode
  const connectionString = customDatabaseUrl.replace('sslmode=require', 'sslmode=disable');

  const pool = new Pool({
    connectionString,
  });

  // Test connection
  try {
    console.log('\n🔌 Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log(`✓ Database connected successfully`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`❌ Connection failed: ${errorMsg}`);
    await pool.end();
    process.exit(1);
  }

  const db = drizzle(pool);

  try {
    console.log('\n🗑️  Clearing existing data...');
    // Clear tables in reverse order of importOrder to avoid foreign key violations
    for (const tableName of [...importOrder].reverse()) {
      if (exportedData.tables[tableName] && exportedData.tables[tableName].length > 0) {
        try {
          await db.delete(tableReferences[tableName].schema);
          console.log(`   ✓ Cleared ${tableName}`);
        } catch (error) {
          console.warn(`   ⚠️  Could not clear ${tableName}:`, error instanceof Error ? error.message : error);
        }
      }
    }

    console.log('\n📥 Importing anonymized data...');
    let totalImported = 0;

    // Import tables in the specified order
    for (const tableName of importOrder) {
      if (!exportedData.tables[tableName]) {
        continue;
      }

      let records = exportedData.tables[tableName];
      if (records.length === 0) {
        console.log(`   ⊘ Skipped ${tableName}: no records`);
        continue;
      }

      // Normalize records: convert ISO string timestamps to proper format
      records = records.map((record: any) => {
        const processed: any = {};
        for (const [key, value] of Object.entries(record)) {
          // Keep ISO timestamp strings as-is; the driver will handle conversion
          if (typeof value === 'string' && value?.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            processed[key] = value;
          } else {
            processed[key] = value;
          }
        }
        return processed;
      });

      try {
        // Insert records in batches with proper error handling
        const batchSize = 50; // Smaller batches for better stability
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, Math.min(i + batchSize, records.length));
          try {
            await db.insert(tableReferences[tableName].schema).values(batch as any).onConflictDoNothing();
          } catch (error) {
            // Try without conflict handling if it fails
            await db.insert(tableReferences[tableName].schema).values(batch as any);
          }
        }

        totalImported += records.length;
        console.log(`   ✓ Imported ${tableName}: ${records.length} records`);
      } catch (error) {
        console.error(`   ✗ Error importing ${tableName}:`, error instanceof Error ? error.message : error);
        throw error;
      }
    }

    console.log('\n✅ Import completed successfully!');
    console.log(`   Total Records Imported: ${totalImported}`);
  } finally {
    await pool.end();
  }
}

// Get parameters from command line
const args = process.argv.slice(2);
const filepath = args[0];
const customDatabaseUrl = args[1];

if (!filepath || !customDatabaseUrl) {
  console.error('❌ Missing parameters');
  console.error('Usage: ts-node src/db/import-to-custom-db.ts <filepath> <database-url>');
  console.error('\nExample:');
  console.error('  ts-node src/db/import-to-custom-db.ts \\');
  console.error('    exports/database-export-anonymized-*.json \\');
  console.error('    "postgresql://postgres:password@host:5432/postgres?sslmode=require"');
  process.exit(1);
}

importDataToCustomDatabase(filepath, customDatabaseUrl)
  .then(() => {
    console.log('\n✨ Import process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });

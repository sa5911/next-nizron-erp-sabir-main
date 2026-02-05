import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '../db/schema/index';

const connectionString = process.argv[2];
const exportFile = process.argv[3] || 'exports/database-export-anonymized-1770326477913.json';

if (!connectionString) {
  console.error('❌ Error: Please provide database connection string as first argument');
  console.log('\nUsage: npx ts-node src/db/import-supabase-complete.ts "postgresql://..."');
  process.exit(1);
}

interface ExportedData {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    totalRecords: number;
    tableCount: number;
  };
}

const tableReferences: Record<string, any> = {
  users: schema.users,
  permissions: schema.permissions,
  roles: schema.roles,
  employees: schema.employees,
  employee_warnings: schema.employeeWarnings,
  employee_files: schema.employeeFiles,
  employee_advances: schema.employee_advances,
  employee_advance_deductions: schema.employee_advance_deductions,
  vehicles: schema.vehicles,
  vehicle_categories: schema.vehicleCategories,
  vehicle_types: schema.vehicleTypes,
  vehicle_assignments: schema.vehicleAssignments,
  vehicle_documents: schema.vehicleDocuments,
  vehicle_images: schema.vehicleImages,
  vehicle_maintenance: schema.vehicleMaintenance,
  fuel_entries: schema.fuelEntries,
  clients: schema.clients,
  client_addresses: schema.client_addresses,
  client_contacts: schema.client_contacts,
  client_contracts: schema.client_contracts,
  client_contract_documents: schema.client_contract_documents,
  client_sites: schema.client_sites,
  site_guard_assignments: schema.site_guard_assignments,
  client_payments: schema.client_payments,
  invoices: schema.invoices,
  attendance: schema.attendance,
  advances: schema.advances,
  leave_periods: schema.leavePeriods,
  payroll_payment_status: schema.payrollPaymentStatus,
  payroll_sheet_entries: schema.payrollSheetEntries,
  finance_accounts: schema.finance_accounts,
  finance_journal_entries: schema.finance_journal_entries,
  finance_journal_lines: schema.finance_journal_lines,
  expenses: schema.expenses,
  general_inventory_items: schema.generalInventoryItems,
  general_inventory_transactions: schema.generalInventoryTransactions,
  restricted_inventory_items: schema.restrictedInventoryItems,
  restricted_serial_units: schema.restrictedSerialUnits,
  restricted_transactions: schema.restrictedTransactions,
  company_settings: schema.companySettings,
  industries: schema.industries,
  users_to_roles: schema.users_to_roles,
  roles_to_permissions: schema.roles_to_permissions,
};

// Tables that should be imported in dependency order
const importOrder = [
  'permissions',
  'roles',
  'users',
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
  'site_guard_assignments',
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
];

async function importToSupabase() {
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!\n');

    const db = drizzle(pool);

    console.log(`📖 Reading export file: ${exportFile}`);
    const exportPath = path.join(__dirname, '../../', exportFile);

    if (!fs.existsSync(exportPath)) {
      throw new Error(`Export file not found: ${exportPath}`);
    }

    const fileContent = fs.readFileSync(exportPath, 'utf-8');
    const exportedData: ExportedData = JSON.parse(fileContent);

    console.log(`✅ Export file loaded`);
    console.log(`   Total records: ${exportedData.metadata.totalRecords}`);
    console.log(`   Tables: ${exportedData.metadata.tableCount}\n`);

    let importedRecords = 0;
    let skippedRecords = 0;

    // Import tables in dependency order
    for (const tableName of importOrder) {
      if (!exportedData.tables[tableName]) {
        continue;
      }

      const rows = exportedData.tables[tableName];

      if (rows.length === 0) {
        console.log(`⏭️  Skipping "${tableName}" (empty)`);
        continue;
      }

      console.log(`📤 Importing "${tableName}" (${rows.length} rows)...`);

      const tableSchema = tableReferences[tableName];
      if (!tableSchema) {
        console.log(`   ⚠️  Table schema not found, skipping...`);
        skippedRecords += rows.length;
        continue;
      }

      try {
        // Insert all rows at once using raw SQL to preserve IDs and exact values
        const columnNames = Object.keys(rows[0]);
        const values = rows.map((row) =>
          '(' +
          columnNames
            .map((col) => {
              const value = row[col];
              if (value === null || value === undefined) {
                return 'NULL';
              }
              if (typeof value === 'boolean') {
                return value ? 'true' : 'false';
              }
              if (typeof value === 'number') {
                return value.toString();
              }
              if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`;
              }
              return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            })
            .join(',') +
          ')',
        );

        const insertQuery = `
          INSERT INTO "${tableName}" (${columnNames.map((c) => `"${c}"`).join(', ')})
          VALUES ${values.join(', ')}
          ON CONFLICT DO NOTHING;
        `;

        await pool.query(insertQuery);
        importedRecords += rows.length;
        console.log(`   ✓ Imported ${rows.length} records`);
      } catch (error) {
        console.error(`   ❌ Error: ${error.message.split('\n')[0]}`);
        skippedRecords += rows.length;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Import Complete!`);
    console.log(`   Records imported: ${importedRecords}`);
    console.log(`   Records skipped: ${skippedRecords}`);
    console.log(`${'='.repeat(50)}`);

    client.release();
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importToSupabase();

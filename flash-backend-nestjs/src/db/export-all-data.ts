import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '../db/schema/index';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in the environment');
}

interface ExportedData {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    totalRecords: number;
    tableCount: number;
  };
}

async function exportAllData(): Promise<void> {
  // Modify connection string to use sslmode=disable for development
  const connectionString = DATABASE_URL?.replace('sslmode=require', 'sslmode=disable') || DATABASE_URL;

  const pool = new Pool({
    connectionString,
  });

  // Test database connection
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log(`✓ Database connected successfully at ${result.rows[0].now}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('❌ Database connection failed:', errorMsg);
    console.error('❌ Please check your DATABASE_URL in .env file');
    await pool.end();
    process.exit(1);
  }

  const db = drizzle(pool);
  const exportedData: ExportedData = {
    timestamp: new Date().toISOString(),
    tables: {},
    metadata: {
      totalRecords: 0,
      tableCount: 0,
    },
  };

  const tables = [
    { name: 'users', schema: schema.users },
    { name: 'permissions', schema: schema.permissions },
    { name: 'roles', schema: schema.roles },
    { name: 'employees', schema: schema.employees },
    { name: 'employee_warnings', schema: schema.employeeWarnings },
    { name: 'employee_files', schema: schema.employeeFiles },
    { name: 'employee_advances', schema: schema.employee_advances },
    { name: 'employee_advance_deductions', schema: schema.employee_advance_deductions },
    { name: 'vehicles', schema: schema.vehicles },
    { name: 'vehicle_categories', schema: schema.vehicleCategories },
    { name: 'vehicle_types', schema: schema.vehicleTypes },
    { name: 'vehicle_assignments', schema: schema.vehicleAssignments },
    { name: 'vehicle_documents', schema: schema.vehicleDocuments },
    { name: 'vehicle_images', schema: schema.vehicleImages },
    { name: 'vehicle_maintenance', schema: schema.vehicleMaintenance },
    { name: 'fuel_entries', schema: schema.fuelEntries },
    { name: 'clients', schema: schema.clients },
    { name: 'client_addresses', schema: schema.client_addresses },
    { name: 'client_contacts', schema: schema.client_contacts },
    { name: 'client_contracts', schema: schema.client_contracts },
    { name: 'client_contract_documents', schema: schema.client_contract_documents },
    { name: 'client_sites', schema: schema.client_sites },
    { name: 'site_guard_assignments', schema: schema.site_guard_assignments },
    { name: 'client_payments', schema: schema.client_payments },
    { name: 'invoices', schema: schema.invoices },
    { name: 'attendance', schema: schema.attendance },
    { name: 'advances', schema: schema.advances },
    { name: 'leave_periods', schema: schema.leavePeriods },
    { name: 'payroll_payment_status', schema: schema.payrollPaymentStatus },
    { name: 'payroll_sheet_entries', schema: schema.payrollSheetEntries },
    { name: 'finance_accounts', schema: schema.finance_accounts },
    { name: 'finance_journal_entries', schema: schema.finance_journal_entries },
    { name: 'finance_journal_lines', schema: schema.finance_journal_lines },
    { name: 'expenses', schema: schema.expenses },
    { name: 'general_inventory_items', schema: schema.generalInventoryItems },
    { name: 'general_inventory_transactions', schema: schema.generalInventoryTransactions },
    { name: 'restricted_inventory_items', schema: schema.restrictedInventoryItems },
    { name: 'restricted_serial_units', schema: schema.restrictedSerialUnits },
    { name: 'restricted_transactions', schema: schema.restrictedTransactions },
    { name: 'company_settings', schema: schema.companySettings },
    { name: 'industries', schema: schema.industries },
    { name: 'users_to_roles', schema: schema.users_to_roles },
    { name: 'roles_to_permissions', schema: schema.roles_to_permissions },
  ];

  console.log('Starting database export...');
  console.log(`Found ${tables.length} tables to export`);

  for (const table of tables) {
    try {
      const data = await db.select().from(table.schema);
      exportedData.tables[table.name] = data;
      exportedData.metadata.totalRecords += data.length;
      exportedData.metadata.tableCount++;
      console.log(`✓ Exported ${table.name}: ${data.length} records`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error(`✗ Error exporting ${table.name}: ${errorMsg}`);
    }
  }

  // Create exports directory if it doesn't exist
  const exportsDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  // Save to JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `database-export-${timestamp}-${Date.now()}.json`;
  const filepath = path.join(exportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(exportedData, null, 2));

  console.log('\n📊 Export Summary:');
  console.log(`Total Records Exported: ${exportedData.metadata.totalRecords}`);
  console.log(`Tables Exported: ${exportedData.metadata.tableCount}`);
  console.log(`\n✅ Data exported successfully to: ${filepath}`);

  // Also create a summary file
  const summaryData = {
    timestamp: exportedData.timestamp,
    totalRecords: exportedData.metadata.totalRecords,
    tableCount: exportedData.metadata.tableCount,
    tables: Object.entries(exportedData.tables).map(([name, data]) => ({
      name,
      recordCount: (data as any[]).length,
    })),
  };

  const summaryFilepath = path.join(exportsDir, `export-summary-${timestamp}-${Date.now()}.json`);
  fs.writeFileSync(summaryFilepath, JSON.stringify(summaryData, null, 2));

  console.log(`📋 Summary saved to: ${summaryFilepath}`);

  await pool.end();
}

// Run the export
exportAllData()
  .then(() => {
    console.log('\n✨ Export completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });

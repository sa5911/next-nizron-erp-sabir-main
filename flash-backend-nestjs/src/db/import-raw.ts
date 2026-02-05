import { Pool } from 'pg';
import * as fs from 'fs';

interface ExportedData {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    totalRecords: number;
    tableCount: number;
  };
}

// Tables to import in correct dependency order
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

function buildInsertQuery(tableName: string, records: any[]): { queries: string[]; values: any[][] } {
  if (records.length === 0) {
    return { queries: [], values: [] };
  }

  const queries: string[] = [];
  const allValues: any[][] = [];

  // Process in batches
  const batchSize = 50;
  for (let batchIndex = 0; batchIndex < records.length; batchIndex += batchSize) {
    const batch = records.slice(batchIndex, Math.min(batchIndex + batchSize, records.length));
    const columns = Object.keys(batch[0]);
    const columnNames = columns.join(', ');
    const placeholders = batch.map((_, rowIndex) => {
      const row = [];
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        row.push(`$${rowIndex * columns.length + colIndex + 1}`);
      }
      return `(${row.join(', ')})`;
    });

    const values: any[] = [];
    batch.forEach((record) => {
      columns.forEach((col) => {
        values.push(record[col] || null);
      });
    });

    const query = `INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`;
    queries.push(query);
    allValues.push(values);
  }

  return { queries, values: allValues };
}

async function importDataRaw(filepath: string, connectionString: string): Promise<void> {
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

  const pool = new Pool({
    connectionString: connectionString.replace('sslmode=require', 'sslmode=disable'),
  });

  try {
    console.log('\n🔌 Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log(`✓ Database connected successfully`);
  } catch (error) {
    console.error(`❌ Connection failed:`, error instanceof Error ? error.message : error);
    await pool.end();
    process.exit(1);
  }

  try {
    console.log('\n🗑️  Clearing existing data...');
    // Clear tables in reverse order
    for (const tableName of [...importOrder].reverse()) {
      if (exportedData.tables[tableName]?.length > 0) {
        try {
          await pool.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
          console.log(`   ✓ Cleared ${tableName}`);
        } catch (error) {
          console.warn(`   ⚠️  Could not clear ${tableName}`);
        }
      }
    }

    console.log('\n📥 Importing anonymized data...');
    let totalImported = 0;

    for (const tableName of importOrder) {
      if (!exportedData.tables[tableName]) {
        continue;
      }

      const records = exportedData.tables[tableName];
      if (records.length === 0) {
        console.log(`   ⊘ Skipped ${tableName}: no records`);
        continue;
      }

      const { queries, values: queryValues } = buildInsertQuery(tableName, records);

      try {
        for (let i = 0; i < queries.length; i++) {
          await pool.query(queries[i], queryValues[i]);
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

const args = process.argv.slice(2);
const filepath = args[0];
const connectionString = args[1];

if (!filepath || !connectionString) {
  console.error('❌ Missing parameters');
  console.error('Usage: ts-node src/db/import-raw.ts <filepath> <connection-string>');
  process.exit(1);
}

importDataRaw(filepath, connectionString)
  .then(() => {
    console.log('\n✨ Import process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });

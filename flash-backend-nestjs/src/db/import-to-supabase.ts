import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const EXPORT_FILE = process.env.EXPORT_FILE || 'exports/database-export-anonymized-1770326477913.json';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY environment variables are required');
  console.log('Set them in your .env file:');
  console.log('SUPABASE_URL=your-project-url.supabase.co');
  console.log('SUPABASE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ExportedData {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    totalRecords: number;
    tableCount: number;
  };
}

// Tables that should be imported in dependency order
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

async function importData() {
  try {
    console.log(`📖 Reading export file: ${EXPORT_FILE}`);
    const exportPath = path.join(__dirname, '../../', EXPORT_FILE);
    
    if (!fs.existsSync(exportPath)) {
      throw new Error(`Export file not found: ${exportPath}`);
    }

    const fileContent = fs.readFileSync(exportPath, 'utf-8');
    const exportedData: ExportedData = JSON.parse(fileContent);

    console.log(`\n✅ Export file loaded`);
    console.log(`   Total records: ${exportedData.metadata.totalRecords}`);
    console.log(`   Tables: ${exportedData.metadata.tableCount}`);

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

      console.log(`\n📤 Importing "${tableName}" (${rows.length} rows)...`);

      try {
        // Insert data in batches of 1000 records
        const batchSize = 1000;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from(tableName)
            .insert(batch, { count: 'exact' });

          if (error) {
            console.error(`   ❌ Error inserting batch ${i / batchSize + 1}: ${error.message}`);
            skippedRecords += batch.length;
          } else {
            importedRecords += batch.length;
            console.log(`   ✓ Imported batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(rows.length / batchSize)}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error importing table "${tableName}": ${error.message}`);
        skippedRecords += rows.length;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Import Complete!`);
    console.log(`   Records imported: ${importedRecords}`);
    console.log(`   Records skipped: ${skippedRecords}`);
    console.log(`${'='.repeat(50)}`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importData();

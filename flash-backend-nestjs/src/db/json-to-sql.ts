import * as fs from 'fs';
import * as path from 'path';

interface ExportedData {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    totalRecords: number;
    tableCount: number;
  };
}

function escapeQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    // Handle ISO timestamp strings
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return `'${escapeQuotes(value)}'`;
    }
    return `'${escapeQuotes(value)}'`;
  }

  return 'NULL';
}

function generateInsertStatements(tableName: string, records: any[]): string[] {
  if (records.length === 0) {
    return [];
  }

  const statements: string[] = [];
  const columns = Object.keys(records[0]);
  const columnList = columns.map((c) => `"${c}"`).join(', ');

  // Add header comment
  statements.push(`\n-- Insert ${records.length} records into ${tableName}`);

  // Create batches of 10 records per INSERT for readability
  const batchSize = 10;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, Math.min(i + batchSize, records.length));
    const valuesList = batch
      .map((record) => {
        const values = columns.map((col) => formatValue(record[col]));
        return `(${values.join(', ')})`;
      })
      .join(',\n  ');

    const statement = `INSERT INTO "${tableName}" (${columnList}) VALUES\n  ${valuesList} ON CONFLICT DO NOTHING;`;
    statements.push(statement);
  }

  return statements;
}

async function convertJsonToSQL(jsonFilePath: string): Promise<void> {
  console.log(`📖 Reading JSON export: ${jsonFilePath}\n`);

  if (!fs.existsSync(jsonFilePath)) {
    throw new Error(`File not found: ${jsonFilePath}`);
  }

  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
  const exportedData: ExportedData = JSON.parse(fileContent);

  const sqlStatements: string[] = [];

  // Add header
  sqlStatements.push('-- Generated SQL Migration File');
  sqlStatements.push(`-- Created: ${new Date().toISOString()}`);
  sqlStatements.push(`-- Total Records: ${exportedData.metadata.totalRecords}`);
  sqlStatements.push(`-- Tables: ${exportedData.metadata.tableCount}`);
  sqlStatements.push('-- This file contains anonymized/dummy data');
  sqlStatements.push('\n-- Disable foreign key checks during import');
  sqlStatements.push('SET session_replication_role = \'replica\';\n');

  const tableOrder = [
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

  for (const tableName of tableOrder) {
    if (exportedData.tables[tableName] && exportedData.tables[tableName].length > 0) {
      const records = exportedData.tables[tableName];
      const statements = generateInsertStatements(tableName, records);
      sqlStatements.push(...statements);
      console.log(`✓ Generated SQL for ${tableName}: ${records.length} records`);
    }
  }

  // Add footer
  sqlStatements.push('\n-- Re-enable foreign key checks');
  sqlStatements.push("SET session_replication_role = 'origin';");
  sqlStatements.push('\n-- Migration completed successfully!');

  const outputFileName = `migration-${Date.now()}.sql`;
  const outputPath = path.join(path.dirname(jsonFilePath), outputFileName);

  fs.writeFileSync(outputPath, sqlStatements.join('\n'));

  console.log(`\n✅ SQL migration file generated!`);
  console.log(`📁 File: ${outputPath}`);
  console.log(`\n📋 Next Steps:`);
  console.log(`   1. Go to Supabase Dashboard → SQL Editor`);
  console.log(`   2. Open this file: ${outputFileName}`);
  console.log(`   3. Copy and paste the content into the SQL Editor`);
  console.log(`   4. Click "Run" to execute`);
  console.log(`\n📊 Statistics:`);
  console.log(`   Total records to import: ${exportedData.metadata.totalRecords}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

const args = process.argv.slice(2);
const jsonFile = args[0];

if (!jsonFile) {
  console.error('❌ Please provide the path to the JSON export file');
  console.error('Usage: ts-node src/db/json-to-sql.ts <path-to-json-file>');
  process.exit(1);
}

convertJsonToSQL(jsonFile)
  .then(() => {
    console.log('\n✨ Conversion completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });

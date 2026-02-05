# Database Export & Import Guide

This guide explains how to export all data from your database and re-import it for migration purposes.

## Overview

The database export/import system allows you to:
- ✅ Export all data from PostgreSQL database into structured JSON files
- ✅ Store data in a format that can be easily version controlled
- ✅ Re-import data into a fresh or existing database
- ✅ Maintain referential integrity with proper table import order
- ✅ Create backups before migrations or schema changes

## Files Created

1. **`src/db/export-all-data.ts`** - Script to export all database data to JSON
2. **`src/db/import-data.ts`** - Script to import JSON data back into the database
3. **`exports/`** - Directory where exported data files are stored

## Prerequisites

- Node.js and npm/yarn installed
- `.env` file configured with `DATABASE_URL`
- All dependencies installed (`npm install`)
- PostgreSQL database is accessible

## Usage

### Step 1: Export All Data

Export the entire database to JSON files:

```bash
npm run db:export
```

**Output:**
- `exports/database-export-YYYY-MM-DD-[timestamp].json` - Full data export
- `exports/export-summary-YYYY-MM-DD-[timestamp].json` - Summary of records per table

**Console Output Example:**
```
Starting database export...
Found 45 tables to export
✓ Exported users: 10 records
✓ Exported employees: 250 records
✓ Exported vehicles: 50 records
✓ Exported attendance: 5000 records
... (more tables)

📊 Export Summary:
Total Records Exported: 15,432
Tables Exported: 45

✅ Data exported successfully to: exports/database-export-2024-02-06-1707252931.json
```

### Step 2: Review Exported Data

Check the summary file to verify what was exported:

```bash
cat exports/export-summary-YYYY-MM-DD-[timestamp].json
```

Example summary file:
```json
{
  "timestamp": "2024-02-06T10:30:45.123Z",
  "totalRecords": 15432,
  "tableCount": 45,
  "tables": [
    { "name": "users", "recordCount": 10 },
    { "name": "employees", "recordCount": 250 },
    { "name": "vehicles", "recordCount": 50 },
    { "name": "attendance", "recordCount": 5000 },
    ...
  ]
}
```

### Step 3: Store Export Files Safely

The export files are JSON and can be:
- Stored in version control (git)
- Backed up to cloud storage
- Shared with team members
- Used for data analysis

### Step 4: Re-Import Data

To import data back into the database:

```bash
npm run db:import -- exports/database-export-2024-02-06-1707252931.json
```

**Parameters:**
- First parameter: Path to the export JSON file

**What happens during import:**
1. ✅ All existing data is cleared (tables emptied)
2. ✅ Tables are cleared in reverse dependency order
3. ✅ Data is imported in correct dependency order
4. ✅ Referential integrity is maintained
5. ✅ Foreign key constraints are respected

**Console Output Example:**
```
Reading export file: exports/database-export-2024-02-06-1707252931.json

📊 Import Details:
Timestamp: 2024-02-06T10:30:45.123Z
Total Records: 15432
Tables to Import: 45

🗑️  Clearing existing data...
✓ Cleared site_guard_assignments
✓ Cleared restricted_transactions
... (reverse order)

📥 Importing data...
✓ Imported users: 10 records
✓ Imported roles: 5 records
✓ Imported permissions: 50 records
... (all tables)

✅ Import completed successfully!
Total Records Imported: 15,432

✨ Import process completed!
```

## Tables Exported

The system exports data from 45 tables including:

### Core
- `users`, `permissions`, `roles`, `users_to_roles`, `roles_to_permissions`

### Employees
- `employees`, `employee_files`, `employee_warnings`, `employee_advances`, `employee_advance_deductions`

### Vehicles
- `vehicles`, `vehicle_categories`, `vehicle_types`, `vehicle_assignments`
- `vehicle_documents`, `vehicle_images`, `vehicle_maintenance`, `fuel_entries`

### Clients
- `clients`, `client_addresses`, `client_contacts`, `client_contracts`, `client_contract_documents`
- `client_sites`, `site_guard_assignments`, `client_payments`

### Finance & Accounting
- `finance_accounts`, `finance_journal_entries`, `finance_journal_lines`
- `invoices`, `expenses`, `advances`

### Inventory
- `general_inventory_items`, `general_inventory_transactions`
- `restricted_inventory_items`, `restricted_serial_units`, `restricted_transactions`

### Payroll & HR
- `attendance`, `leave_periods`, `payroll_payment_status`, `payroll_sheet_entries`

### Other
- `industries`, `company_settings`

## Common Use Cases

### Use Case 1: Database Backup Before Migration
```bash
# Export current data
npm run db:export

# Run your migration
npm run db:migration:latest

# If issues occur, restore from backup
npm run db:import -- exports/database-export-[backup].json
```

### Use Case 2: Clone Data to Another Environment
```bash
# On Production
npm run db:export

# Copy exports/database-export-*.json to development machine

# On Development
npm run db:import -- exports/database-export-[production-backup].json
```

### Use Case 3: Create Test Data Set
```bash
# Export production-like data
npm run db:export

# Use single export file in version control for consistent testing
# Reference: exports/database-export-v1.json
```

### Use Case 4: Version Control Data Changes
```bash
# Commit export files to git
git add exports/
git commit -m "Update test data export with latest production snapshot"

# Later, restore at any point in time
npm run db:import -- exports/database-export-[commit-hash].json
```

## Advanced Options

### Selective Import
To import only specific tables, edit the `importOrder` array in `import-data.ts` before running.

### Batch Size Configuration
The import script uses a batch size of 100 records for insertion. Adjust in `import-data.ts` if needed:
```typescript
const batchSize = 100; // Change this value
```

### Error Handling
If import fails:
1. Check the console error message
2. Verify the export file is valid JSON
3. Ensure DATABASE_URL is correct
4. Check database connectivity

## File Structure

```
flash-backend-nestjs/
├── src/
│   └── db/
│       ├── export-all-data.ts         (Export script)
│       ├── import-data.ts             (Import script)
│       └── schema/index.ts            (Database schema)
├── exports/                            (Export directory)
│   ├── database-export-2024-02-06-[timestamp].json
│   └── export-summary-2024-02-06-[timestamp].json
└── package.json                        (Updated with new scripts)
```

## Troubleshooting

### Problem: "DATABASE_URL is not set"
**Solution:** Add `DATABASE_URL` to your `.env` file
```env
DATABASE_URL=postgresql://user:password@localhost:5432/flash_db
```

### Problem: "File not found: exports/..."
**Solution:** Use the correct path to the export file
```bash
npm run db:import -- exports/database-export-2024-02-06-1234567890.json
```

### Problem: Import fails due to foreign key violations
**Solution:** The script clears tables in reverse dependency order. If it still fails:
1. Check for circular dependencies
2. Verify data consistency in export file
3. Try importing into a fresh database

### Problem: Large data set causes timeout
**Solution:** Increase the batch size in `import-data.ts`:
```typescript
const batchSize = 50; // Smaller batches for stability
```

## Performance Notes

- **Export Time**: ~30 seconds for 10K+ records
- **Import Time**: ~30 seconds for 10K+ records
- **File Size**: Typically 10-20MB per export file (depends on data volume)

## Security Considerations

⚠️ **Important:** Export files contain all database data including sensitive information:
- User passwords (if stored)
- Personal information (SSN, contact details)
- Financial data

**Best Practices:**
- Store export files securely
- Don't commit to public repositories
- Use `.gitignore` if keeping locally:
  ```
  exports/*.json
  ```
- Encrypt files before storing on shared servers
- Limit access to who can view export files

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify your database connection
3. Review the console output for error messages
4. Ensure all tables are properly defined in schema

## Related Commands

```bash
# Database operations
npm run db:export              # Export all data
npm run db:import -- <file>    # Import data
npm run seed                   # Run seed script
npm run seed:employees         # Seed sample employees
npm run seed:employees:all     # Seed all employees

# Development
npm start                      # Start dev server
npm run start:dev             # Start with watch
npm run build                 # Production build
```

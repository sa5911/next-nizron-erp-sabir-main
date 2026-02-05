# Supabase Data Import Guide

This guide walks you through importing your anonymized data into Supabase.

## Prerequisites

1. **Supabase Project**: Create a project at https://supabase.com if you don't have one
2. **API Keys**: Get your Supabase URL and API keys
3. **Node.js Dependencies**: Supabase client library needs to be installed

## Setup Steps

### 1. Install Dependencies

```bash
cd flash-backend-nestjs
npm install
```

The `@supabase/supabase-js` package has been added to `package.json`.

### 2. Get Your Supabase Credentials

1. Go to your Supabase project: https://supabase.com
2. Click on **Settings** → **API**
3. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (for SQL import) or **Anon Key** (for JSON import)

⚠️ **Important**: 
- Use **Service Role Key** for more powerful operations (SQL import)
- Use **Anon Key** for standard JSON import (safer for production)

### 3. Configure Environment Variables

Add to your `.env` file in `flash-backend-nestjs/`:

```env
# For JSON import (recommended for most cases)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
EXPORT_FILE=exports/database-export-anonymized-1770326477913.json

# For SQL import (requires service role key)
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

## Import Methods

You have three options for importing data to Supabase:

### Option 1: JSON Import (Recommended)

This imports the anonymized JSON export into Supabase.

```bash
npm run db:import:supabase
```

**Advantages:**
- ✅ Safer (uses anon key)
- ✅ Better error handling
- ✅ Respects table dependencies
- ✅ Shows progress with batch imports

**How it works:**
1. Reads `exports/database-export-anonymized-1770326477913.json`
2. Connects to Supabase using your API key
3. Inserts data in batches of 1000 rows
4. Respects table dependencies (users before related tables)
5. Skips empty tables
6. Reports success/failed records

### Option 2: SQL Import

This runs SQL migration files directly against your Supabase database.

```bash
npm run db:import:sql
# Or with custom file:
npm run db:import:sql exports/migration-1770326616074.sql
```

**Advantages:**
- ✅ Exact schema recreation
- ✅ Preserves constraints and triggers
- ✅ Single operation vs. multiple inserts

**Disadvantages:**
- ⚠️ Requires service role key
- ⚠️ Less detailed error handling

### Option 3: Direct Database Connection

Use your existing `DATABASE_URL` to import to Supabase's PostgreSQL:

```bash
npm run db:import
```

This uses your existing import-data.ts script with Supabase's PostgreSQL database.

## Available Export Files

The following anonymized exports are available in `exports/`:

```
directory: flash-backend-nestjs/exports/

Files available:
- database-export-anonymized-1770326477913.json    (Latest anonymized export)
- database-export-2026-02-05-1770326156035.json    (Anonymized backup)
- migration-1770326616074.sql                       (SQL migration file)
- export-summary-2026-02-05-1770326156061.json     (Export metadata)
```

List available exports:
```bash
npm run db:exports:list
```

## Step-by-Step Example

### 1. Prepare Environment
```bash
cd flash-backend-nestjs

# Create .env file with your credentials
echo "SUPABASE_URL=https://your-project.supabase.co" > .env
echo "SUPABASE_KEY=your-anon-key" >> .env
echo "EXPORT_FILE=exports/database-export-anonymized-1770326477913.json" >> .env
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Import
```bash
npm run db:import:supabase
```

### 4. Monitor Progress
Watch for:
- ✅ Connection successful
- 📤 Table import progress
- ✅ Import complete with record count

## Troubleshooting

### Error: "SUPABASE_URL and SUPABASE_KEY are required"
- Add these variables to your `.env` file
- Ensure you have the correct credentials from Supabase

### Error: "Export file not found"
- Check the file path in `EXPORT_FILE`
- Ensure the export file exists in `exports/` directory
- Run `npm run db:exports:list` to see available files

### Error: "Permission denied" or "Foreign key constraint"
- Ensure tables are imported in the correct order (handled automatically)
- Check if parent tables exist before dependent tables
- Try dropping and recreating tables in Supabase

### Error: "Network timeout"
- Check your internet connection
- Verify Supabase project is accessible
- Try running the import again
- Consider breaking the import into smaller batches

### Error: "Duplicate key value"
- The data might already be imported
- Clear tables in Supabase if starting fresh
- Check primary key constraints

## Data Validation

After import, verify your data:

```sql
-- Count records in each table
SELECT 
  table_name,
  (SELECT COUNT(*) FROM table_name::regclass) as row_count
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Run this query in Supabase's SQL Editor to check import results.

## Database Schema

The import follows these table dependencies (order matters):

1. **Base tables**: users, permissions, roles, employees
2. **Categories**: vehicle_categories, vehicle_types, industries
3. **Management**: clients, company_settings, vehicles
4. **Finance**: finance_accounts, finance_journal_entries
5. **Relations**: users_to_roles, roles_to_permissions
6. **Details**: client_addresses, client_contacts, vehicle_documents, etc.
7. **Transactions**: attendance, fuel_entries, expenses, etc.

The scripts handle this automatically.

## Performance Tips

- 📊 For large imports, use batch processing (default: 1000 records per batch)
- 🚀 Consider disabling foreign key checks temporarily (if needed)
- 💾 Monitor Supabase edge function usage (SQL import uses more)
- ⚡ Use anon key for safety, service role key for max power

## Security Notes

- ✅ Never commit `.env` file with real credentials
- ✅ Use service role key only for admin operations
- ✅ Rotate API keys regularly
- ✅ Consider using Row Level Security (RLS) in Supabase
- ✅ Audit import logs for unauthorized access

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase documentation: https://supabase.com/docs
3. Check export file contents: `npm run db:exports:list`
4. Verify database connection: Test your DATABASE_URL

---

**Last Updated**: 2026-02-06  
**Scripts**: `import-to-supabase.ts` | `import-sql-to-supabase.ts`  
**Data Format**: JSON (anonymized)  
**Target**: Supabase PostgreSQL Database

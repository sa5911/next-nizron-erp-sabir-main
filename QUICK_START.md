# Quick Start: Import Data to Supabase

## 🚀 Quick Reference

### 1-Minute Setup
```bash
cd flash-backend-nestjs
npm run db:setup:supabase   # Interactive setup wizard
npm install                 # Install dependencies
npm run db:import:supabase  # Start import
```

---

## 📋 What Was Created

### New Scripts Added to `package.json`:

| Script | Purpose | Command |
|--------|---------|---------|
| `db:setup:supabase` | Interactive setup wizard | `npm run db:setup:supabase` |
| `db:import:supabase` | Import JSON data (recommended) | `npm run db:import:supabase` |
| `db:import:sql` | Import SQL migrations | `npm run db:import:sql` |

### New Files Created:

1. **[src/db/import-to-supabase.ts](flash-backend-nestjs/src/db/import-to-supabase.ts)**
   - Imports anonymized JSON exports to Supabase
   - Handles batch processing (1000 records at a time)
   - Respects table dependencies
   - Shows detailed progress

2. **[src/db/import-sql-to-supabase.ts](flash-backend-nestjs/src/db/import-sql-to-supabase.ts)**
   - Imports SQL migration files
   - Executes raw SQL statements
   - Recreates exact schema with constraints

3. **[src/db/setup-supabase.ts](flash-backend-nestjs/src/db/setup-supabase.ts)**
   - Interactive configuration wizard
   - Validates Supabase credentials
   - Sets up .env file automatically
   - Checks available exports

4. **[SUPABASE_IMPORT_GUIDE.md](SUPABASE_IMPORT_GUIDE.md)** (this workspace)
   - Comprehensive guide
   - Troubleshooting section
   - Security best practices
   - Performance tips

---

## 🔑 Environment Variables Needed

Add to `.env` in `flash-backend-nestjs/`:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Optional (for SQL import)
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional (specify which export to use)
EXPORT_FILE=exports/database-export-anonymized-1770326477913.json
```

**Get these from**: https://supabase.com → Your Project → Settings → API

---

## 📊 Export Files Available

Located in `flash-backend-nestjs/exports/`:

```
database-export-anonymized-1770326477913.json  ← Latest (use this)
database-export-2026-02-05-1770326156035.json  ← Backup
migration-1770326616074.sql                    ← SQL migration
export-summary-2026-02-05-1770326156061.json   ← Metadata
```

---

## ✅ Import Methods Comparison

| Method | File Type | Safety | Speed | Command |
|--------|-----------|--------|-------|---------|
| **JSON** | `.json` | ✅ Safest | Medium | `npm run db:import:supabase` |
| **SQL** | `.sql` | ⚠️ Powerful | Fastest | `npm run db:import:sql` |

**Recommended**: Use **JSON Import** for safety and reliability.

---

## 🎯 Complete Instructions

### Step 1: Install Dependencies
```bash
cd flash-backend-nestjs
npm install
```

### Step 2: Configure Supabase
**Option A: Interactive Setup (Easiest)**
```bash
npm run db:setup:supabase
```
This will guide you through:
- Entering Supabase credentials
- Selecting export file
- Creating .env file

**Option B: Manual Setup**
1. Create `.env` file in `flash-backend-nestjs/`
2. Add your Supabase credentials
3. Add export file path

### Step 3: Run Import
```bash
npm run db:import:supabase
```

### Step 4: Monitor Progress
Watch for:
- ✅ Connection established
- 📤 Table import progress  
- ✅ Import complete with summary

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "SUPABASE_URL not set" | Add to .env: `SUPABASE_URL=your-url` |
| "Export file not found" | Check path in .env `EXPORT_FILE=` |
| "Foreign key constraint" | Imports respect table order automatically |
| "Network timeout" | Check internet, try again |
| "Duplicate key error" | Data already imported, clear tables first |

See **SUPABASE_IMPORT_GUIDE.md** for detailed troubleshooting.

---

## 📱 Import Process Details

The import script:

1. ✅ Loads anonymized export data
2. ✅ Connects to Supabase database
3. ✅ Imports tables in dependency order:
   - Users & Roles first
   - Categories & Base tables
   - Related data (addresses, contacts, etc.)
   - Transaction data (attendance, fuel, etc.)
4. ✅ Processes 1000 records per batch
5. ✅ Reports success/failure for each table
6. ✅ Shows total records imported

---

## 🔒 Security Notes

- ✅ Use **Anon Key** for standard operations (JSON import)
- ⚠️ Use **Service Role Key** only for admin ops (SQL import)
- ✅ Never commit `.env` with real credentials to git
- ✅ Rotate credentials after import if needed
- ✅ Consider enabling RLS (Row Level Security) in Supabase

---

## 🎓 What Got Imported?

The anonymized export contains:

- **Users & Roles** - Employee accounts and permissions
- **Organization** - Clients, sites, industries
- **Vehicles** - Assets, categories, maintenance records
- **Finance** - Accounts, invoices, payments
- **HR** - Attendance, leave, payroll
- **Inventory** - General and restricted items
- **Transactions** - Fuel entries, expenses, advances

**All data is anonymized** - No real names, emails, or sensitive info.

---

## 🔗 Useful Links

- [Supabase Dashboard](https://supabase.com)
- [Documentation](SUPABASE_IMPORT_GUIDE.md) (detailed guide)
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## 📞 Need Help?

1. Check [SUPABASE_IMPORT_GUIDE.md](SUPABASE_IMPORT_GUIDE.md)
2. Verify .env configuration
3. Check export files exist: `npm run db:exports:list`
4. Review error messages in import output
5. Check Supabase project is active and accessible

---

**Created**: 2026-02-06  
**Status**: ✅ Ready to use  
**Next Step**: Run `npm run db:setup:supabase`

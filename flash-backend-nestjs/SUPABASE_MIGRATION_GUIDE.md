# Database Migration to Supabase - Complete Guide

## What We've Done

1. ✅ **Exported all production data** (1,273 records from 43 tables)
2. ✅ **Anonymized the data** (created realistic dummy data)
3. ✅ **Created import scripts** (ready to use)

## Files Created

- `src/db/anonymize-data.ts` - Script to anonymize exported data
- `src/db/import-raw.ts` - Raw SQL import for better compatibility
- `exports/database-export-anonymized-1770326477913.json` - Anonymized data ready to import

## Connection Issue

The script encountered a DNS resolution error trying to reach `db.kndwpdugnkzkqubfrybb.supabase.co`. This could be due to:
- Network connectivity issues
- Firewall/proxy blocking DNS
- VPN not connected
- ISP DNS issues

## Solution: 3 Options

### Option 1: Import from a Server/Machine with Network Access (RECOMMENDED)

```bash
# Copy the anonymized data file to a server that can reach Supabase
scp exports/database-export-anonymized-1770326477913.json user@server:/path/

# SSH into that server and run:
cd /path/to/flash-backend-nestjs
npm install
npx ts-node src/db/import-raw.ts \
  exports/database-export-anonymized-1770326477913.json \
  "postgresql://postgres:u9YXo25kKC53qEyx@db.kndwpdugnkzkqubfrybb.supabase.co:5432/postgres?sslmode=require"
```

### Option 2: Use psql Command (if installed)

If you have PostgreSQL client tools installed on your development machine:

```bash
# First, edit the anonymized JSON to convert to SQL using a simple script
# Or manually execute:

PGPASSWORD='u9YXo25kKC53qEyx' psql \
  -h db.kndwpdugnkzkqubfrybb.supabase.co \
  -U postgres \
  -d postgres \
  -p 5432 \
  -c "SELECT version();"
```

### Option 3: Import via Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Connect to your database
3. Use the SQL Editor to:
   ```sql
   -- Option A: Disable foreign key checks temporarily
   SET session_replication_role = 'replica';
   
   -- Copy and paste INSERT statements from the anonymized data
   -- (would need to convert JSON to SQL)
   
   -- Re-enable foreign key checks
   SET session_replication_role = 'origin';
   ```

### Option 4: Create SQL Migration File

```bash
# I can create a SQL file from the anonymized JSON
# Run this command:
npm run db:anonymize -- exports/database-export-2026-02-05-1770326156035.json

# Then let me convert the JSON to SQL INSERT statements
```

## Network Troubleshooting

Try these commands to diagnose the issue:

```powershell
# Test DNS resolution
nslookup db.kndwpdugnkzkqubfrybb.supabase.co

# Test connectivity
Test-NetConnection -ComputerName db.kndwpdugnkzkqubfrybb.supabase.co -Port 5432

# Check if VPN is needed
# (Ask your network administrator)

# Try Google DNS
nslookup db.kndwpdugnkzkqubfrybb.supabase.co 8.8.8.8
```

## Data Preview

Your anonymized data includes:
- **Users**: 1 record (admin user)
- **Employees**: 749 records (with fake names, emails, phones, CNICs)
- **Clients**: 58 records (with generated company names)
- **Client Sites**: 141 records
- **Vehicles**: 3 records (with fake license plates)
- **Attendance**: 194 records
- **And 37 more tables** with appropriate dummy data

All sensitive data has been replaced with realistic fake data:
- ✓ Real names changed to fake Pakistani names
- ✓ Phone numbers changed to fake Pakistani numbers
- ✓ CNICs changed to fake but valid format
- ✓ Emails changed to fake addresses
- ✓ License plates changed to fake plates
- ✓ Bank accounts changed to fake accounts
- ✓ Addresses changed to generic locations
- ✓ File paths cleared
- ✓ Pictures set to null

## Next Steps

1. **Choose your preferred method above** (Option 1 is most reliable)

2. **If choosing Option 4**, run:
   ```bash
   npm run db:export  # Creates fresh export
   ```

3. **Monitor SQL Logs** to ensure all data imports successfully

4. **Verify data** in Supabase Dashboard:
   ```sql
   SELECT COUNT(*) as total FROM employees;
   SELECT COUNT(*) as total FROM clients;
   SELECT COUNT(*) as total FROM attendance;
   ```

## Files Ready to Use

```bash
# Anonymized data export
exports/database-export-anonymized-1770326477913.json  (4.13 MB)

# Original unexported data still preserved
exports/database-export-2026-02-05-1770326156035.json  (3.94 MB)
```

## Rollback Plan

If something goes wrong during import:
1. The data is backed up in `exports/`
2. You can restore the original database
3. Original production data is unchanged (still in original DB)

## Support

For issues:
1. Check network connectivity first
2. Verify Supabase credentials
3. Ensure database is in "Running" state in Supabase dashboard
4. Check Supabase logs for import errors

---

**Connection String Format:**
```
postgresql://postgres:u9YXo25kKC53qEyx@db.kndwpdugnkzkqubfrybb.supabase.co:5432/postgres
```

**Note:** All passwords are included for reference. In production, use environment variables.

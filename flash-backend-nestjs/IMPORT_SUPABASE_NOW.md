# QUICK START - Import to Supabase (60 seconds)

## Your Files Ready 🎉

✅ **SQL Migration**: `exports/migration-1770326616074.sql` (1.28 MB)  
✅ **1,273 Records**: All anonymized, ready to import  
✅ **Zero Configuration**: Just paste & run  

---

## FASTEST WAY TO IMPORT (3 Steps)

### Step 1: Open Supabase Dashboard
- Go to https://app.supabase.com
- Login to your account
- Select your project

### Step 2: Open SQL Editor
- Click **"SQL Editor"** on the left
- Click **"New Query"**

### Step 3: Paste & Run
- Open file: `exports/migration-1770326616074.sql`
- Copy ALL content (Ctrl+A → Ctrl+C)
- Paste into Supabase editor (Ctrl+V)
- Click **"RUN"** button

✨ **Done!** Wait 2-5 minutes for completion

---

## VERIFY IT WORKED

Run this in Supabase SQL Editor:

```sql
SELECT COUNT(*) as total FROM employees;
```

Should show: **749 records** ✓

---

## YOUR CREDENTIALS

```
Host: db.kndwpdugnkzkqubfrybb.supabase.co
User: postgres
Password: u9YXo25kKC53qEyx
Database: postgres
Port: 5432
```

---

## IF YOU WANT TO IMPORT PROGRAMMATICALLY

```bash
cd d:\next-nizron-erp-sabir-main\flash-backend-nestjs

npx ts-node src/db/import-raw.ts ^
  exports/database-export-anonymized-1770326477913.json ^
  "postgresql://postgres:u9YXo25kKC53qEyx@db.kndwpdugnkzkqubfrybb.supabase.co:5432/postgres?sslmode=require"
```

(May fail due to network issues - Dashboard method is safer)

---

## 🎯 WHAT'S IN THE DATA

| Item | Count |
|------|-------|
| Employees | 749 |
| Clients | 58 |
| Sites | 141 |
| Attendance | 194 |
| Other Records | 131 |
| **TOTAL** | **1,273** |

All with **FAKE DATA** (names, emails, phones, addresses changed)

---

## ✅ DONE!

After import:
1. Database ready with dummy data ✓
2. Safe for testing/development ✓  
3. Original data still in old DB ✓
4. Can repeat anytime ✓

**Questions?** See `MIGRATION_STATUS.md` or `SUPABASE_MIGRATION_GUIDE.md`

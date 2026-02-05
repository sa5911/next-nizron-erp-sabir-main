# Quick Start: Database Export & Import

## One-Minute Setup

### Export Database
```bash
npm run db:export
```
All data saved to `exports/database-export-[DATE]-[TIME].json`

### Import Database
```bash
npm run db:import -- exports/database-export-[DATE]-[TIME].json
```
Restores all data from export file

## What's Exported?
✅ All 45 tables  
✅ All records with relationships intact  
✅ Generated as readable JSON  

## Files Created

| File | Purpose |
|------|---------|
| `src/db/export-all-data.ts` | Export script |
| `src/db/import-data.ts` | Import script |
| `exports/database-export-*.json` | Exported data |
| `exports/export-summary-*.json` | Record count per table |

## Step-by-Step

### Step 1: Export
```bash
npm run db:export
```
- Waits for completion
- Shows progress for each table
- Saves to `exports/` folder

### Step 2: Store
```bash
# View what was exported
cat exports/export-summary-*.json

# Backup the file
cp exports/database-export-*.json backups/
```

### Step 3: Import (when needed)
```bash
npm run db:import -- exports/database-export-[YOUR-FILE].json
```
- Clears existing data
- Imports in correct order
- Respects foreign keys

## Common Commands

```bash
# Backup before migration
npm run db:export

# Clone to another environment
npm run db:export              # On source
npm run db:import -- file.json # On target

# Restore from backup
npm run db:import -- exports/database-export-[date].json
```

## Troubleshooting

**"DATABASE_URL is not set"**
→ Add to `.env`: `DATABASE_URL=postgresql://user:pass@host/db`

**"File not found"**
→ Check file path: `ls exports/database-export-*.json`

**Import failed**
→ Check database connection and try again

## Tips

- 📦 **Store exports in version control** for data snapshots
- 🔒 **Don't commit to public repos** - contains sensitive data
- ⏰ **Export takes ~30s** for 10K+ records
- 📁 **File size ~10-20MB** depending on data volume

---
See [DATABASE_EXPORT_GUIDE.md](./DATABASE_EXPORT_GUIDE.md) for detailed documentation.

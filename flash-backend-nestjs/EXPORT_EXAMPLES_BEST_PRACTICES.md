# Database Export & Import - Examples & Best Practices

## Real-World Scenarios

### Scenario 1: Backup Before Schema Migration

```bash
# Step 1: Export current data
npm run db:export
# Output: exports/database-export-2024-02-06-170325.json

# Step 2: Review what was exported
npm run db:exports:list

# Step 3: Run your schema migration (via drizzle or manual)
# Your migration commands here...

# Step 4a: If migration succeeds - keep the backup
git add exports/database-export-2024-02-06-170325.json
git commit -m "Backup before schema migration"

# Step 4b: If migration fails - restore from backup
npm run db:import -- exports/database-export-2024-02-06-170325.json
```

### Scenario 2: Copy Production Data to Development

**On Production Server:**
```bash
npm run db:export
# Exports data to exports/database-export-2024-02-06-prod.json
```

**Transfer the file** (via secure method):
```bash
# Option 1: SSH
scp user@prod-server:/path/exports/database-export-*.json ./exports/

# Option 2: Direct download
wget https://secure-server/exports/database-export-*.json

# Option 3: Cloud storage
aws s3 cp exports/database-export-*.json s3://backups/
aws s3 cp s3://backups/database-export-*.json ./exports/
```

**On Development Server:**
```bash
npm run db:import -- exports/database-export-2024-02-06-prod.json
```

### Scenario 3: Maintain Test Data in Version Control

```bash
# Scenario: You want consistent test data across your team

# Step 1: Export production-like data
npm run db:export
# Create exports/database-export-test-data.json

# Step 2: Commit to git
git add exports/database-export-test-data.json
git commit -m "Add test dataset with 10K employees and 1K vehicles"

# Step 3: Team members can restore this exact dataset
npm run db:import -- exports/database-export-test-data.json

# Step 4: When you need fresh data, repeat from step 1
npm run db:export
# Creates new exports/database-export-2024-02-06-170325.json
```

**Important:** Don't commit sensitive data!
```bash
# .gitignore
exports/database-export-*.json        # Don't commit time-stamped exports
!exports/database-export-test-data.json  # DO commit named test data
```

### Scenario 4: Emergency Data Recovery

```bash
# Accidental data deletion occurred!

# Step 1: List available backups
npm run db:exports:list
# Shows all previous exports with timestamps

# Step 2: Choose the right backup
# Outputs show timestamp, record count, and file size
# Example output:
# 1. database-export-2024-02-06-170325.json
#    📅 Timestamp: 02/06/2024 17:03:25
#    📦 Records: 15,432
#    💾 Size: 16.5 MB

# Step 3: Restore from that point in time
npm run db:import -- exports/database-export-2024-02-06-170325.json

# Step 4: Verify data is restored
npm run db:exports:list  # Check current state
```

### Scenario 5: Database Inspection Before Import

```bash
# You have multiple export files and want to choose the right one

# Step 1: List all exports with record counts
npm run db:exports:list

# Step 2: Inspect a specific export to see which tables have data
npm run db:exports list

# Step 3: Based on the summary, choose which to import
npm run db:import -- exports/[selected-file].json
```

## Best Practices

### 1. Regular Backups
```bash
# Create a cron job (Linux/Mac)
0 2 * * * cd /path/to/project && npm run db:export

# Or use a task scheduler (Windows)
# Create scheduled task to run: npm run db:export
```

### 2. Naming Convention
```bash
# Good export names (for version control)
exports/database-export-test-data.json
exports/database-export-v1.json
exports/database-export-template.json

# System generated (timestamped)
exports/database-export-2024-02-06-170325.json
```

### 3. Storage Strategy
```bash
exports/
├── templates/
│   ├── database-export-test-data.json      # Shared test data
│   ├── database-export-empty-template.json # Fresh start
│   └── database-export-demo-data.json      # Demo purposes
├── backups/
│   ├── database-export-2024-02-01.json
│   ├── database-export-2024-02-04.json
│   └── database-export-2024-02-06.json
└── archive/
    ├── database-export-2024-01-31.json
    └── database-export-2024-01-15.json
```

### 4. Before Import Checklist
```bash
# ✅ Always verify before importing:

# 1. Check file exists
ls -lh exports/database-export-*.json

# 2. View file size and timestamp
npm run db:exports:list

# 3. Backup current database first (just in case)
npm run db:export

# 4. Verify database connection
echo "SELECT version();" | psql $DATABASE_URL

# 5. Finally, import
npm run db:import -- exports/database-export-[file].json
```

### 5. Git Workflow
```bash
# Typical workflow
git checkout -b fix/employee-data
npm run db:export
git add exports/database-export-fix-employee.json
git commit -m "Add test data for employee module"
git push origin fix/employee-data

# On CI/CD pipeline
npm run db:import -- exports/database-export-fix-employee.json
npm run test
```

## Performance Optimization

### For Large Databases (100K+ records)

**1. Adjust Import Batch Size:**
```typescript
// In src/db/import-data.ts
const batchSize = 50;  // Reduce from 100 for stability
```

**2. Split Exports (Optional):**
```bash
# Export only specific tables by modifying export script temporarily
# This is useful if file size becomes too large (>1GB)
```

**3. Parallel Processing (Advanced):**
Create separate import streams for independent tables (requires code modification).

## Troubleshooting Guide

### Problem: Export takes too long
```bash
# Check database load
psql $DATABASE_URL -c "SELECT count(*) FROM attendance;"

# If too many records, consider:
# 1. Export in off-peak hours
# 2. Reduce batch size
# 3. Archive old records first
```

### Problem: Import fails with foreign key error
```bash
# This shouldn't happen with the provided scripts,
# but if it does:

# 1. Check export file is valid JSON
jq . exports/database-export-*.json > /dev/null

# 2. Check database state
npm run db:exports:list

# 3. Try importing to a fresh database first
# (to rule out existing data conflicts)

# 4. Review import order in import-data.ts
```

### Problem: Out of memory during import
```bash
# Reduce batch size in src/db/import-data.ts
const batchSize = 25;  // From 100

# For very large files, consider:
npm run db:import -- exports/database-export-*.json
```

### Problem: File size too large
```bash
# Check average file size
npm run db:exports:list

# Expected sizes:
# - 1K records: ~100 KB
# - 10K records: ~1 MB
# - 100K records: ~10 MB
# - 1M records: ~100 MB

# If larger, database may have bloat - consider cleanup
```

## Production Checklist

Before using in production, verify:

- [ ] Database connection string is correct
- [ ] Database user has proper permissions (SELECT, INSERT, DELETE)
- [ ] Sufficient disk space for export file
- [ ] Backups are stored securely and encrypted
- [ ] Export/import scripts run without errors
- [ ] Tested restore process at least once
- [ ] Team trained on procedures
- [ ] Documentation updated
- [ ] Automated backups scheduled
- [ ] Access controls in place for export files

## Security Reminders

⚠️ **These exports contain sensitive data:**
- User credentials
- Personal information
- Financial records
- Employment details

**Security practices:**
```bash
# 1. Don't commit to public repositories
git add exports/database-export-*.json
git update-index --assume-unchanged exports/database-export-*.json

# 2. Encrypt before storing
gpg --symmetric exports/database-export-*.json

# 3. Use secure transfer
scp -P 2222 exports/database-export-*.json secure-server:backups/

# 4. Limit access
chmod 600 exports/database-export-*.json

# 5. Delete old backups
rm -f exports/database-export-*.json  # Keep only essential ones
```

## Advanced Usage

### Custom Table Selection
Edit `importOrder` in `src/db/import-data.ts` to import only specific tables.

### Scheduled Exports (via cron)
```bash
#!/bin/bash
# backup-db.sh
cd /path/to/project
npm run db:export
BACKUP_FILE=$(ls -t exports/database-export-*.json | head -1)
aws s3 cp "$BACKUP_FILE" s3://my-backups/
```

### Email Backup Notification
```bash
npm run db:export && mail -s "DB Backup Complete" admin@example.com
```

## Related Documentation

- See [DATABASE_EXPORT_GUIDE.md](./DATABASE_EXPORT_GUIDE.md) for detailed reference
- See [EXPORT_IMPORT_QUICKSTART.md](./EXPORT_IMPORT_QUICKSTART.md) for quick reference
- Check [src/db/export-all-data.ts](./src/db/export-all-data.ts) for implementation details

# Database Maintenance Scripts

This directory contains scripts for database maintenance and cleanup operations.

## Available Scripts

### 1. Remove All Duplicates (Comprehensive)
**File:** `remove-all-duplicates.ts`
**Command:** `npm run db:cleanup:duplicates`

**Purpose:** Scans for duplicate records and orphan records across all tables. Shows what's found but doesn't delete duplicates (designed for verification).

**Features:**
- Checks 15 tables with unique constraints for duplicates
- Identifies orphan records in 25 related tables
- Removes orphan records automatically
- Shows detailed report of findings

**Usage:**
```bash
npm run db:cleanup:duplicates
```

**Output:**
- List of duplicate records found
- Number of orphan records removed
- Summary statistics

---

### 2. Remove Duplicates Advanced
**File:** `remove-duplicates-advanced.ts`
**Command:** `npm run db:remove:duplicates`

**Purpose:** Actively removes duplicate records by keeping the oldest record (lowest ID).

**Features:**
- Removes duplicate records while preserving the first occurrence
- Shows which specific records are being deleted (IDs)
- Detailed logging of each operation
- Error handling for failed deletions

**Usage:**
```bash
npm run db:remove:duplicates
```

**Strategy:**
- Keeps the record with the lowest ID (oldest)
- Deletes all other occurrences
- Uses `DELETE ... WHERE id = ANY(...)` for safe deletion

---

### 3. Cleanup Duplicates (Original)
**File:** `cleanup-duplicates.ts`

**Purpose:** Original cleanup script focusing on specific tables.

**Features:**
- Cleans vehicle_categories, industries, vehicle_types
- Removes orphan records
- Shows data after cleanup

---

## Tables Monitored for Duplicates

### User & Permission Tables
- `users` (email)
- `permissions` (name)
- `roles` (name)

### Vehicle Tables
- `vehicles` (vehicle_id)
- `vehicle_categories` (name)
- `vehicle_types` (name)

### Financial Tables
- `expenses` (expense_id)
- `finance_journal_entries` (entry_no)
- `invoices` (invoice_id)

### Inventory Tables
- `general_inventory_items` (item_code)
- `restricted_inventory_items` (item_code)
- `restricted_serial_units` (serial_number)

### Client & Employee Tables
- `clients` (client_id)
- `employees` (employee_id)
- `industries` (name)

## Orphan Record Checks

The scripts check for orphan records in these relationships:
- Employee-related tables → employees
- Client-related tables → clients
- Inventory transactions → inventory items
- Vehicle-related tables → vehicles
- Site assignments → client sites
- Journal lines → journal entries & accounts

## Running Scripts Safely

### 1. Always Backup First
```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### 2. Check First, Delete Later
```bash
# Step 1: Check for issues
npm run db:cleanup:duplicates

# Step 2: Review the output

# Step 3: Remove duplicates if needed
npm run db:remove:duplicates

# Step 4: Verify cleanup
npm run db:cleanup:duplicates
```

### 3. Use with SSL Bypass (for Supabase)
```bash
# Windows PowerShell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run db:cleanup:duplicates

# Linux/Mac
NODE_TLS_REJECT_UNAUTHORIZED='0' npm run db:cleanup:duplicates
```

## When to Run Cleanup

### Regular Maintenance
- Weekly: Check for orphan records
- Monthly: Full duplicate scan
- After bulk imports: Immediate cleanup check

### Required Scenarios
- After data migration
- After importing from external sources
- When seeing unique constraint errors
- Before production deployments

## Understanding the Output

### Duplicate Detection
```
⚠ Found 3 duplicate Vehicle IDs in "vehicles"
  - "VH448676": 3 occurrences (IDs: 18, 20, 22)
✓ Removed 2 duplicate records from "vehicles"
```
- **Found:** Number of unique values with duplicates
- **Occurrences:** How many times each value appears
- **IDs:** Database IDs of duplicate records
- **Removed:** Number of duplicate records deleted (keeps first)

### Orphan Detection
```
⚠ Found 582 attendance records without parent employees
✓ Removed 582 orphan records from "attendance"
```
- **Found:** Records referencing non-existent parent records
- **Removed:** All orphan records are deleted

## Preventing Duplicates

### Application Code
```typescript
// Use ON CONFLICT clauses
await db.insert(users)
  .values({ email: 'test@example.com' })
  .onConflictDoNothing();

// Or use UPSERT
await db.insert(users)
  .values({ email: 'test@example.com', name: 'Test' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'Test' }
  });
```

### Import Scripts
```typescript
// Check before inserting
const existing = await db.select()
  .from(users)
  .where(eq(users.email, email));

if (!existing.length) {
  await db.insert(users).values({ email, name });
}
```

## Troubleshooting

### SSL Certificate Errors
**Error:** `SELF_SIGNED_CERT_IN_CHAIN`
**Solution:** Set `NODE_TLS_REJECT_UNAUTHORIZED='0'`

### Permission Errors
**Error:** `permission denied for table`
**Solution:** Ensure DATABASE_URL has proper credentials

### Timeout Errors
**Error:** Script times out
**Solution:** Increase timeout in script or run during low-traffic periods

### Foreign Key Violations
**Error:** `violates foreign key constraint`
**Solution:** The script handles this by not deleting records with dependencies

## Script Development

### Adding New Tables
To add a new table to duplicate checking:

1. Edit `remove-duplicates-advanced.ts`
2. Add to `duplicateChecks` array:
```typescript
{ 
  table: 'your_table', 
  uniqueColumn: 'unique_column', 
  description: 'Description for users' 
}
```

### Adding Orphan Checks
To add a new orphan check:

1. Edit `remove-all-duplicates.ts`
2. Add to `orphanChecks` array:
```typescript
{
  table: 'child_table',
  childCol: 'foreign_key_column',
  parentTable: 'parent_table',
  parentCol: 'primary_key_column',
  description: 'description of what you're checking'
}
```

## Best Practices

1. **Test in Development First** - Always test scripts on dev/staging before production
2. **Run During Off-Peak Hours** - Database operations can be resource-intensive
3. **Monitor Results** - Review the output carefully before marking as complete
4. **Keep Logs** - Save script output for audit trails
5. **Backup Before Running** - Always have a recent backup
6. **Run After Imports** - Check data integrity after bulk operations

## Support

For issues or questions about these scripts:
1. Check the main [DATABASE_CLEANUP_SUMMARY.md](../../DATABASE_CLEANUP_SUMMARY.md)
2. Review script output for specific error messages
3. Check database logs for constraint violations
4. Verify DATABASE_URL is correctly configured in `.env`

---
Last Updated: February 7, 2026

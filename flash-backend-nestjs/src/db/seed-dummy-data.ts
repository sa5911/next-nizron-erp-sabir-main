import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log('Starting seed...');

  try {
    // Helper to check if a column exists
    const columnExistence: Record<string, string[]> = {};
    const getColumns = async (tableName: string) => {
        if (columnExistence[tableName]) return columnExistence[tableName];
        const res = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = '${tableName}'
        `);
        columnExistence[tableName] = res.rows.map(r => r.column_name);
        console.log(`Columns found for ${tableName}:`, columnExistence[tableName]);
        return columnExistence[tableName];
    };

    const filterValues = (tableName: string, cols: string[], values: any) => {
        const filtered: any = {};
        for (const key in values) {
            if (cols.includes(key)) {
                filtered[key] = values[key];
            } else {
                console.log(`Skipping column ${key} for table ${tableName} (not in DB)`);
            }
        }
        return filtered;
    };

    // 1. Industries
    console.log('Seeding industries...');
    const indCols = await getColumns('industries');
    const industryNames = ['Security', 'Finance', 'Healthcare', 'IT', 'Retail'];
    for (const name of industryNames) {
        const vals = filterValues('industries', indCols, { name });
        await db.insert(schema.industries).values(vals).onConflictDoNothing().catch(e => console.error('Industry fail:', e.message));
    }

    // 2. Finance Accounts
    console.log('Seeding finance accounts...');
    const accCols = await getColumns('finance_accounts');
    for (let i = 0; i < 10; i++) {
        const name = faker.finance.accountName();
        if (accCols.includes('code') && accCols.includes('account_type')) {
            await pool.query('INSERT INTO finance_accounts (code, name, account_type, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', 
                [faker.finance.accountNumber(5), name, 'expense', true]).catch(e => console.error('Account raw fail:', e.message));
        } else {
            await pool.query('INSERT INTO finance_accounts (name) VALUES ($1)', [name]).catch(e => console.error('Account raw fail basic:', e.message));
        }
    }
    const allAccountsRes = await pool.query('SELECT id, name FROM finance_accounts');
    const allAccounts = allAccountsRes.rows;

    // 3. Employees
    const allEmployees = await db.select().from(schema.employees);
    console.log(`All employees count: ${allEmployees.length}`);

    if (allEmployees.length > 0) {
        // 4. Leave Periods
        console.log('Seeding leave periods...');
        const lpCols = await getColumns('leave_periods');
        for (let i = 0; i < 15; i++) {
            const emp = faker.helpers.arrayElement(allEmployees);
            const vals = filterValues('leave_periods', lpCols, {
                employee_id: emp.employee_id,
                from_date: faker.date.recent().toISOString(),
                to_date: faker.date.soon().toISOString(),
                leave_type: 'Casual',
                status: 'approved',
                reason: faker.lorem.sentence()
            });
            await db.insert(schema.leavePeriods).values(vals).catch(e => console.error('Leave fail:', e.message));
        }

        // 5. Payroll Payment Status
        console.log('Seeding payroll status...');
        const ppsCols = await getColumns('payroll_payment_status');
        for (let i = 0; i < 15; i++) {
            const emp = faker.helpers.arrayElement(allEmployees);
            const vals = filterValues('payroll_payment_status', ppsCols, {
                employee_id: emp.employee_id,
                month: '2024-01',
                status: 'paid'
            });
            await db.insert(schema.payrollPaymentStatus).values(vals).catch(e => console.error('Payroll status fail:', e.message));
        }
    }

    // 6. Journal Entries
    console.log('Seeding journal entries...');
    const jeCols = await getColumns('finance_journal_entries');
    const jlCols = await getColumns('finance_journal_lines');
    for (let i = 0; i < 10; i++) {
        const jeValues = filterValues('finance_journal_entries', jeCols, {
            entry_no: `JE-${faker.string.alphanumeric(6).toUpperCase()}`,
            entry_date: faker.date.recent().toISOString(),
            amount: faker.number.int({ min: 100, max: 1000 }),
            status: 'posted'
        });
        
        const entry = await db.insert(schema.finance_journal_entries).values(jeValues).returning().catch(e => {
            console.error('JE fail:', e.message);
            return null;
        });

        if (entry && entry[0] && allAccounts.length >= 2) {
            const acc1 = faker.helpers.arrayElement(allAccounts);
            const acc2 = faker.helpers.arrayElement(allAccounts.filter(a => a.id !== acc1.id));
            
            if (jlCols.includes('debit') && jlCols.includes('credit')) {
                await pool.query('INSERT INTO finance_journal_lines (entry_id, account_id, debit, credit) VALUES ($1, $2, $3, $4)', 
                    [entry[0].id, acc1.id, 100, 0]).catch(e => console.error('JL1 raw fail:', e.message));
                await pool.query('INSERT INTO finance_journal_lines (entry_id, account_id, debit, credit) VALUES ($1, $2, $3, $4)', 
                    [entry[0].id, acc2.id, 0, 100]).catch(e => console.error('JL2 raw fail:', e.message));
            } else {
                await pool.query('INSERT INTO finance_journal_lines (entry_id, account_id) VALUES ($1, $2)', 
                    [entry[0].id, acc1.id]).catch(e => console.error('JL1 raw basic fail:', e.message));
                await pool.query('INSERT INTO finance_journal_lines (entry_id, account_id) VALUES ($1, $2)', 
                    [entry[0].id, acc2.id]).catch(e => console.error('JL2 raw basic fail:', e.message));
            }
        }
    }

    // 7. Expenses
    console.log('Seeding expenses...');
    const expCols = await getColumns('expenses');
    for (let i = 0; i < 15; i++) {
        const vals = filterValues('expenses', expCols, {
            expense_id: `EXP-${faker.string.alphanumeric(6).toUpperCase()}`,
            category: 'General',
            amount: faker.number.int({ min: 50, max: 500 }),
            description: 'Seed expense',
            expense_date: faker.date.recent().toISOString(),
            status: 'approved'
        });
        await db.insert(schema.expenses).values(vals).catch(e => console.error('Expense fail:', e.message));
    }

    // 8. Inventory
    console.log('Seeding general inventory and transactions...');
    const giCols = await getColumns('general_inventory_items');
    const gitCols = await getColumns('general_inventory_transactions');
    for (let i = 0; i < 10; i++) {
        const itemCode = `GI-${faker.string.alphanumeric(5).toUpperCase()}`;
        const vals = filterValues('general_inventory_items', giCols, {
            item_code: itemCode,
            category: 'Supplies',
            name: faker.commerce.productName(),
            unit_name: 'pcs',
            quantity_on_hand: 50
        });
        await db.insert(schema.generalInventoryItems).values(vals).catch(e => console.error('GenInv fail:', e.message));

        const gitVals = filterValues('general_inventory_transactions', gitCols, {
            item_code: itemCode,
            action: 'issue',
            quantity: 5,
            notes: 'Initial seed stock issue'
        });
        await db.insert(schema.generalInventoryTransactions).values(gitVals).catch(e => console.error('GenInvTx fail:', e.message));
    }

    const restrictedItems = await db.select().from(schema.restrictedInventoryItems);
    if (restrictedItems.length > 0) {
        console.log('Seeding restricted serial units and transactions...');
        const rsuCols = await getColumns('restricted_serial_units');
        const rtCols = await getColumns('restricted_transactions');
        for (const item of restrictedItems) {
            // Seed serial units
            for (let j = 0; j < 5; j++) {
                const sn = `SN-${faker.string.alphanumeric(10).toUpperCase()}`;
                const rsuVals = filterValues('restricted_serial_units', rsuCols, {
                    item_code: item.item_code,
                    serial_number: sn,
                    status: 'available'
                });
                const unit = await db.insert(schema.restrictedSerialUnits).values(rsuVals).returning().catch(e => {
                    console.error('RSU fail:', e.message);
                    return null;
                });

                // Seed transaction for this unit
                const rtVals = filterValues('restricted_transactions', rtCols, {
                    item_code: item.item_code,
                    serial_unit_id: unit && unit[0] ? unit[0].id : undefined,
                    action: 'return',
                    notes: 'Seed return data'
                });
                await db.insert(schema.restrictedTransactions).values(rtVals).catch(e => console.error('Restricted tx fail:', e.message));
            }
        }
    }

    // 9. Vehicles
    const allVehicles = await db.select().from(schema.vehicles);
    if (allVehicles.length > 0) {
        console.log('Seeding fuel and maintenance...');
        const feCols = await getColumns('fuel_entries');
        const vmCols = await getColumns('vehicle_maintenance');
        for (let i = 0; i < 10; i++) {
            const v = faker.helpers.arrayElement(allVehicles);
            
            const feVals = filterValues('fuel_entries', feCols, {
                vehicle_id: v.vehicle_id,
                entry_date: faker.date.recent().toISOString(),
                liters: 20,
                total_cost: 5000,
                fuel_type: 'Diesel'
            });
            await db.insert(schema.fuelEntries).values(feVals).catch(e => console.error('Fuel fail:', e.message));

            const vmVals = filterValues('vehicle_maintenance', vmCols, {
                vehicle_id: v.vehicle_id,
                maintenance_date: faker.date.recent().toISOString(),
                description: 'Service',
                status: 'completed'
            });
            await db.insert(schema.vehicleMaintenance).values(vmVals).catch(e => console.error('Maint fail:', e.message));
        }
    }

    // 10. Advances
    if (allEmployees.length > 0) {
        console.log('Seeding advances...');
        const eaCols = await getColumns('employee_advances');
        const ewCols = await getColumns('employee_warnings');
        for (let i = 0; i < 10; i++) {
            const emp = faker.helpers.arrayElement(allEmployees);
            
            const eaVals = filterValues('employee_advances', eaCols, {
                employee_db_id: emp.id,
                amount: 5000,
                advance_date: faker.date.recent().toISOString()
            });
            await db.insert(schema.employee_advances).values(eaVals).catch(e => console.error('EmpAdv fail:', e.message));

            const ewVals = filterValues('employee_warnings', ewCols, {
                employee_id: emp.employee_id,
                warning_date: faker.date.recent().toISOString(),
                subject: 'Seed Warning'
            });
            await db.insert(schema.employeeWarnings).values(ewVals).catch(e => console.error('Warning fail:', e.message));
        }
    }

    console.log('Seed process finished.');
  } catch (error) {
    console.error('Seed top-level fail:', error);
  } finally {
    await pool.end();
  }
}

seed();

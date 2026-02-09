import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function restoreClientsFromBackup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Find the latest backup
    const backupTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'clients_backup%' 
      ORDER BY table_name DESC 
      LIMIT 1;
    `);

    if (backupTables.rows.length === 0) {
      console.log('✗ No backup table found.');
      return;
    }

    const backupTable = backupTables.rows[0].table_name;
    console.log(`Found backup table: ${backupTable}\n`);

    // Check backup data
    const backupCount = await client.query(`SELECT COUNT(*) as count FROM ${backupTable};`);
    console.log(`Backup contains ${backupCount.rows[0].count} clients\n`);

    // Check current clients
    const currentCount = await client.query(`SELECT COUNT(*) as count FROM clients;`);
    console.log(`Current clients table has ${currentCount.rows[0].count} clients\n`);

    if (backupCount.rows[0].count === '0') {
      console.log('✗ Backup table is empty.');
      return;
    }

    console.log('Restoring clients from backup...\n');

    // Start transaction
    await client.query('BEGIN');

    try {
      // Delete current clients
      await client.query('DELETE FROM clients;');

      // Check and create sequence if needed
      const seqCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_class WHERE relname = 'clients_id_seq'
        ) as exists;
      `);

      if (!seqCheck.rows[0].exists) {
        console.log('Creating sequence clients_id_seq...');
        await client.query(`CREATE SEQUENCE clients_id_seq;`);
        await client.query(`ALTER TABLE clients ALTER COLUMN id SET DEFAULT nextval('clients_id_seq');`);
        await client.query(`ALTER SEQUENCE clients_id_seq OWNED BY clients.id;`);
      }

      // Reset sequence
      await client.query(`ALTER SEQUENCE clients_id_seq RESTART WITH 1;`);

      // Get backup data
      const backupData = await client.query(`
        SELECT client_id, name, company_name, email, phone, address, 
               industry, status, notes, created_at, industry_id
        FROM ${backupTable}
        ORDER BY client_id;
      `);

      // Restore each client
      for (const row of backupData.rows) {
        await client.query(`
          INSERT INTO clients (
            client_id, name, company_name, email, phone, address, 
            industry, status, notes, created_at, industry_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          row.client_id,
          row.name,
          row.company_name,
          row.email,
          row.phone,
          row.address,
          row.industry,
          row.status,
          row.notes,
          row.created_at,
          row.industry_id
        ]);
      }

      await client.query('COMMIT');
      console.log(`✓ Restored ${backupData.rows.length} clients\n`);

      // Verify restoration
      const verifyResult = await client.query(`
        SELECT id, client_id, name FROM clients ORDER BY id;
      `);

      console.log('Restored clients:');
      verifyResult.rows.forEach(row => {
        console.log(`  ID: ${row.id}, Client ID: ${row.client_id}, Name: ${row.name}`);
      });

      console.log(`\n✓ Restoration complete!`);

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

  } catch (err) {
    console.error('\n✗ Restoration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

restoreClientsFromBackup();

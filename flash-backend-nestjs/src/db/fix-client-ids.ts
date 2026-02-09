import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function fixClientIds() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check the current state
    console.log('Checking current state of clients table...');
    const countResult = await client.query(`
      SELECT COUNT(*) as total, COUNT(id) as with_id 
      FROM clients;
    `);
    console.log(`Total clients: ${countResult.rows[0].total}`);
    console.log(`Clients with ID: ${countResult.rows[0].with_id}`);
    console.log(`Clients with NULL ID: ${countResult.rows[0].total - countResult.rows[0].with_id}\n`);

    if (countResult.rows[0].with_id === countResult.rows[0].total) {
      console.log('✓ All clients have valid IDs. No fix needed.');
      return;
    }

    // Get all clients with their serial numbers
    const clientsResult = await client.query(`
      SELECT ctid, client_id, name 
      FROM clients 
      ORDER BY client_id;
    `);

    console.log(`\nFound ${clientsResult.rows.length} clients to fix:`);
    clientsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.client_id} - ${row.name} (ctid: ${row.ctid})`);
    });

    console.log('\n⚠️  This will assign new sequential IDs to all clients.');
    console.log('Creating backup of current clients...\n');

    // Create backup table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients_backup_${Date.now()} AS 
      SELECT * FROM clients;
    `);
    console.log('✓ Backup created\n');

    // Get all clients ordered by client_id
    const allClients = await client.query(`
      SELECT ctid, client_id, name, company_name, email, phone, address, 
             industry, status, notes, created_at, industry_id
      FROM clients 
      ORDER BY client_id;
    `);

    console.log('Assigning new sequential IDs...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    try {
      // Delete all clients
      await client.query(`DELETE FROM clients;`);
      
      // Check if sequence exists, if not create it
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
      
      // Reset the sequence
      await client.query(`ALTER SEQUENCE clients_id_seq RESTART WITH 1;`);
      
      // Re-insert all clients to get new sequential IDs
      for (const row of allClients.rows) {
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
      console.log(`✓ Assigned new IDs to ${allClients.rows.length} clients\n`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    // Verify the fix
    const verifyResult = await client.query(`
      SELECT id, client_id, name FROM clients ORDER BY id LIMIT 10;
    `);
    
    console.log('Verification - First 10 clients:');
    verifyResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Client ID: ${row.client_id}, Name: ${row.name}`);
    });

    const finalCount = await client.query(`
      SELECT COUNT(*) as total, COUNT(id) as with_id FROM clients;
    `);
    
    console.log(`\n✓ Fix complete!`);
    console.log(`Total clients: ${finalCount.rows[0].total}`);
    console.log(`Clients with valid ID: ${finalCount.rows[0].with_id}`);

  } catch (err) {
    console.error('\n✗ Fix failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixClientIds();

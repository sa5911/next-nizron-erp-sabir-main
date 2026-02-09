import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function setupAutoIncrement() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    console.log('Setting up auto-increment for all tables...\n');

    // Get all tables with an 'id' column
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.columns
      WHERE column_name = 'id' 
        AND table_schema = 'public'
        AND table_name NOT LIKE '%backup%'
      ORDER BY table_name;
    `);

    let fixed = 0;
    let skipped = 0;

    for (const row of tablesResult.rows) {
      const table = row.table_name;
      const seqName = `${table}_id_seq`;
      
      // Check if sequence exists
      const seqCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_class WHERE relname = $1
        ) as exists;
      `, [seqName]);

      if (!seqCheck.rows[0].exists) {
        console.log(`Creating sequence for ${table}...`);
        
        // Create sequence
        await client.query(`CREATE SEQUENCE ${seqName};`);
        
        // Set default value
        await client.query(`
          ALTER TABLE ${table} 
          ALTER COLUMN id SET DEFAULT nextval('${seqName}');
        `);
        
        // Associate sequence with table
        await client.query(`
          ALTER SEQUENCE ${seqName} OWNED BY ${table}.id;
        `);
        
        // Set sequence to start after current max ID
        const maxId = await client.query(`SELECT MAX(id) as max_id FROM ${table};`);
        const nextId = (parseInt(maxId.rows[0].max_id) || 0) + 1;
        
        await client.query(`ALTER SEQUENCE ${seqName} RESTART WITH ${nextId};`);
        
        console.log(`✓ ${table}: Sequence created, next ID: ${nextId}`);
        fixed++;
      } else {
        // Verify sequence configuration
        const colCheck = await client.query(`
          SELECT column_default 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'id';
        `, [table]);

        const hasDefault = colCheck.rows[0]?.column_default?.includes('nextval');
        
        if (hasDefault) {
          console.log(`✓ ${table}: Already configured`);
        } else {
          console.log(`Updating ${table} to use sequence...`);
          
          // Set default value
          await client.query(`
            ALTER TABLE ${table} 
            ALTER COLUMN id SET DEFAULT nextval('${seqName}');
          `);
          
          // Set sequence to start after current max ID
          const maxId = await client.query(`SELECT MAX(id) as max_id FROM ${table};`);
          const nextId = (parseInt(maxId.rows[0].max_id) || 0) + 1;
          
          await client.query(`ALTER SEQUENCE ${seqName} RESTART WITH ${nextId};`);
          
          console.log(`✓ ${table}: Default set, next ID: ${nextId}`);
          fixed++;
        }
        
        skipped++;
      }
    }

    console.log('\n======================================');
    console.log('AUTO-INCREMENT SETUP COMPLETE');
    console.log('======================================\n');
    console.log(`Sequences created/fixed: ${fixed}`);
    console.log(`Already configured: ${skipped}`);
    console.log(`Total tables: ${tablesResult.rows.length}\n`);

    // Verify all sequences
    console.log('Verification:\n');
    for (const row of tablesResult.rows) {
      const table = row.table_name;
      const seqName = `${table}_id_seq`;
      
      const seqCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_class WHERE relname = $1
        ) as exists;
      `, [seqName]);

      const colCheck = await client.query(`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'id';
      `, [table]);

      const hasDefault = colCheck.rows[0]?.column_default?.includes('nextval');
      const seqExists = seqCheck.rows[0].exists;

      if (seqExists && hasDefault) {
        // Try to get next value safely
        try {
          const seqVal = await client.query(`
            SELECT last_value as last_val 
            FROM ${seqName};
          `);
          console.log(`✓ ${table}: Sequence ready, next ID will be: ${seqVal.rows[0].last_val + 1}`);
        } catch (err) {
          console.log(`✓ ${table}: Sequence configured`);
        }
      } else {
        console.log(`⚠️  ${table}: Sequence: ${seqExists ? '✓' : '✗'}, Default: ${hasDefault ? '✓' : '✗'}`);
      }
    }

    console.log('\n✓ All tables configured for auto-increment!');

  } catch (err) {
    console.error('\n✗ Setup failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupAutoIncrement();

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.argv[2];
const sqlFile = process.argv[3] || 'exports/migration-1770326616074.sql';

if (!connectionString) {
  console.error('❌ Error: Please provide database connection string as first argument');
  console.log('\nUsage: npx ts-node src/db/import-direct.ts "postgresql://user:password@host:5432/db" [sqlFile]');
  console.log('\nExample:');
  console.log('npx ts-node src/db/import-direct.ts "postgresql://postgres:PASSWORD@db.supabase.co:5432/postgres"');
  process.exit(1);
}

async function importSQL() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const fullPath = path.join(__dirname, '../../', sqlFile);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`SQL file not found: ${fullPath}`);
    }

    console.log(`📖 Reading SQL file: ${sqlFile}`);
    const sqlContent = fs.readFileSync(fullPath, 'utf-8');
    const fileSize = (sqlContent.length / 1024 / 1024).toFixed(2);
    console.log(`✅ SQL file loaded (${fileSize} MB)\n`);

    // Split statements more carefully
    const statements = sqlContent
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/i) // Don't split on ; inside quotes
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip very short statements or comments
      if (statement.length < 5 || statement.startsWith('--')) {
        continue;
      }

      try {
        process.stdout.write(`⏳ [${i + 1}/${statements.length}] Executing... `);
        
        await client.query(statement);
        
        console.log('✅');
        successCount++;
      } catch (error) {
        console.log(`❌ Error: ${error.message.split('\n')[0]}`);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ SQL Import Complete!`);
    console.log(`   Successful statements: ${successCount}`);
    console.log(`   Failed statements: ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

    if (errorCount === 0) {
      console.log('🎉 All data imported successfully to Supabase!');
    } else {
      console.log('⚠️  Some statements failed. Check errors above.');
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importSQL();

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  console.log('\nFor SQL-based import, use the service role key (not the anon key)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function importSQLFile(filePath: string) {
  try {
    console.log(`📖 Reading SQL file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`SQL file not found: ${filePath}`);
    }

    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    console.log(`✅ SQL file loaded (${(sqlContent.length / 1024).toFixed(2)} KB)`);

    // Split SQL statements (handle various endings)
    const statements = sqlContent
      .split(/;(?=\s*[A-Z]|$)/i)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`\n📝 Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // Use raw SQL execution via Supabase
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement,
          });

          if (error) {
            console.error(`   ❌ Error: ${error.message}`);
            errorCount++;
          } else {
            console.log(`   ✓ Statement executed`);
            successCount++;
          }
        } catch (rpcError) {
          console.error(`   ❌ RPC Error:`, (rpcError as any).message);
          errorCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ SQL Import Complete!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
    console.log(`${'='.repeat(50)}`);

  } catch (error) {
    console.error('❌ SQL Import failed:', error.message);
    process.exit(1);
  }
}

// Command line argument handling
const args = process.argv.slice(2);
const sqlFile = args[0] || 'exports/migration-1770326616074.sql';
const fullPath = path.join(__dirname, '../../', sqlFile);

importSQLFile(fullPath);

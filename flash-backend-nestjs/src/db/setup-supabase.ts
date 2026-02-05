#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setupSupabaseImport() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Supabase Import Setup Helper                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check if .env exists
  const envPath = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);

  if (envExists) {
    console.log('✅ Found existing .env file\n');
    const useExisting = await question('Do you want to update your existing .env? (y/n) ');
    if (useExisting.toLowerCase() !== 'y') {
      console.log('\n✅ Setup cancelled. Your .env file remains unchanged.');
      rl.close();
      return;
    }
  }

  console.log('\n📋 Please provide your Supabase credentials:');
  console.log('(You can find these at: https://supabase.com → Settings → API)\n');

  const supabaseUrl = await question('🔗 Supabase Project URL (https://xxxxx.supabase.co): ');
  const supabaseKey = await question('🔑 Supabase Anon Key (for JSON import): ');
  const supabaseServiceKey = await question('🔐 Supabase Service Role Key (optional, for SQL import): ');

  console.log('\n📁 Export file to import:');
  console.log('   1. database-export-anonymized-1770326477913.json (latest)');
  console.log('   2. database-export-2026-02-05-1770326156035.json');
  console.log('   3. Custom file path');

  const fileChoice = await question('\nSelect option (1-3) [default: 1]: ') || '1';
  
  let exportFile = 'exports/database-export-anonymized-1770326477913.json';
  if (fileChoice === '2') {
    exportFile = 'exports/database-export-2026-02-05-1770326156035.json';
  } else if (fileChoice === '3') {
    exportFile = await question('Enter file path (relative to flash-backend-nestjs): ');
  }

  // Create/update .env
  let envContent = '';
  envContent += `# Supabase Configuration\n`;
  envContent += `SUPABASE_URL=${supabaseUrl}\n`;
  envContent += `SUPABASE_KEY=${supabaseKey}\n`;
  if (supabaseServiceKey) {
    envContent += `SUPABASE_SERVICE_KEY=${supabaseServiceKey}\n`;
  }
  envContent += `EXPORT_FILE=${exportFile}\n`;
  envContent += `\n# Database URL (if using direct connection)\n`;
  envContent += `# DATABASE_URL=postgresql://user:password@localhost:5432/dbname\n`;

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ .env file created/updated successfully!\n');

  // Verify exports exist
  console.log('📂 Checking export files...\n');
  const exportsDir = path.join(process.cwd(), 'exports');
  
  if (fs.existsSync(exportsDir)) {
    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.sql'));
    
    if (jsonFiles.length > 0) {
      console.log('Found export files:');
      jsonFiles.forEach(file => {
        const filePath = path.join(exportsDir, file);
        const size = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
        console.log(`  ✓ ${file} (${size} MB)`);
      });
    } else {
      console.log('⚠️  No JSON or SQL export files found in exports/ directory');
    }
  } else {
    console.log('⚠️  exports/ directory not found');
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Setup Complete!                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Next steps:\n');
  console.log('1. Install dependencies (if not done):');
  console.log('   npm install\n');

  console.log('2. Run the import:');
  console.log('   npm run db:import:supabase    (for JSON import - recommended)');
  console.log('   npm run db:import:sql         (for SQL import)\n');

  console.log('3. Monitor the import progress and watch for any errors.\n');

  console.log('📚 For more details, see: SUPABASE_IMPORT_GUIDE.md\n');

  rl.close();
}

// Run setup
setupSupabaseImport().catch(console.error);

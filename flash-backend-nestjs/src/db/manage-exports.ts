import * as fs from 'fs';
import * as path from 'path';

interface ExportSummary {
  timestamp: string;
  totalRecords: number;
  tableCount: number;
  tables: Array<{
    name: string;
    recordCount: number;
  }>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

async function listExports(): Promise<void> {
  const exportsDir = path.join(process.cwd(), 'exports');

  if (!fs.existsSync(exportsDir)) {
    console.log('📁 No exports directory found yet.');
    console.log('Run: npm run db:export');
    return;
  }

  const files = fs.readdirSync(exportsDir);
  const summaryFiles = files.filter((f) => f.startsWith('export-summary-') && f.endsWith('.json'));
  const exportFiles = files.filter((f) => f.startsWith('database-export-') && f.endsWith('.json'));

  if (summaryFiles.length === 0 && exportFiles.length === 0) {
    console.log('📁 No exports found in the exports/ directory.');
    console.log('Run: npm run db:export');
    return;
  }

  console.log('\n📊 Available Database Exports\n');
  console.log('═'.repeat(120));

  const exports = exportFiles
    .map((filename) => {
      const filepath = path.join(exportsDir, filename);
      const stats = fs.statSync(filepath);
      const summaryFilename = filename.replace('database-export-', 'export-summary-');
      const summaryPath = path.join(exportsDir, summaryFilename);

      let summary: ExportSummary | null = null;
      try {
        if (fs.existsSync(summaryPath)) {
          const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
          summary = JSON.parse(summaryContent);
        }
      } catch {
        // Ignore summary parse errors
      }

      return {
        filename,
        filepath,
        size: stats.size,
        createdAt: stats.birthtime || stats.mtime,
        summary,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (exports.length === 0) {
    console.log('No export files found.');
    return;
  }

  exports.forEach((exp, index) => {
    console.log(`\n${index + 1}. ${exp.filename}`);
    console.log('   ' + '─'.repeat(116));

    if (exp.summary) {
      console.log(`   📅 Timestamp: ${formatDate(exp.summary.timestamp)}`);
      console.log(`   📦 Records: ${exp.summary.totalRecords.toLocaleString()}`);
      console.log(`   📋 Tables: ${exp.summary.tableCount}`);
    }

    console.log(`   💾 Size: ${formatBytes(exp.size)}`);
    console.log(`   📂 Path: exports/${exp.filename}`);

    // Show usage command
    console.log(`\n   📥 To import this export:`);
    console.log(`      npm run db:import -- exports/${exp.filename}`);
  });

  console.log('\n' + '═'.repeat(120));
  console.log(`\nTotal exports available: ${exports.length}`);
  console.log(`\n💡 To create a new export: npm run db:export`);
}

async function showTopTables(summaryFile: string, limit: number = 10): Promise<void> {
  const filepath = path.join(process.cwd(), 'exports', summaryFile);

  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return;
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const summary: ExportSummary = JSON.parse(content);

  console.log(`\n📊 Top ${limit} Tables by Record Count\n`);
  console.log('─'.repeat(50));

  const sorted = summary.tables.sort((a, b) => b.recordCount - a.recordCount).slice(0, limit);

  sorted.forEach((table, index) => {
    const percentage = ((table.recordCount / summary.totalRecords) * 100).toFixed(1);
    const barLength = Math.floor((table.recordCount / sorted[0].recordCount) * 30);
    const bar = '█'.repeat(barLength);

    console.log(`${index + 1}. ${table.name.padEnd(30)} ${table.recordCount.toString().padStart(10)} (${percentage}%) ${bar}`);
  });

  console.log('─'.repeat(50));
  console.log(`Total Records: ${summary.totalRecords.toLocaleString()}`);
  console.log(`Total Tables: ${summary.tableCount}`);
}

// Handle arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === 'list') {
    await listExports();
  } else if (command === 'top' && args[1]) {
    const limit = args[2] ? parseInt(args[2]) : 10;
    await showTopTables(args[1], limit);
  } else {
    console.log('\n🔍 Database Export Manager\n');
    console.log('Usage:');
    console.log('  npx ts-node src/db/manage-exports.ts list              - List all exports');
    console.log('  npx ts-node src/db/manage-exports.ts top <file> [n]   - Show top N tables by size');
    console.log('\nExamples:');
    console.log('  npx ts-node src/db/manage-exports.ts list');
    console.log('  npx ts-node src/db/manage-exports.ts top export-summary-2024-02-06-*.json 15');
    console.log('\n');
    await listExports();
  }
}

main().catch(console.error);

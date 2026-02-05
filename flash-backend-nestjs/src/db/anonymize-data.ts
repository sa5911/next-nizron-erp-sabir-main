import * as fs from 'fs';
import * as path from 'path';
import { faker } from '@faker-js/faker';

interface ExportedData {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    totalRecords: number;
    tableCount: number;
  };
}

// List of fake names for employees
const firstNames = [
  'Ahmed', 'Hassan', 'Muhammad', 'Ali', 'Fatima', 'Aisha', 'Zainab', 'Layla',
  'Omar', 'Bilal', 'Ibrahim', 'Abdullah', 'Khalid', 'Yousuf', 'Amina', 'Sara'
];

const lastNames = [
  'Khan', 'Ahmed', 'Hassan', 'Malik', 'Hussain', 'Ali', 'Ibrahim', 'Abdullah',
  'Shah', 'Iqbal', 'Raza', 'Siddiqui', 'Mirza', 'Bhatti', 'Baig', 'Sheikh'
];

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomName(): string {
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function generateFakePhone(): string {
  return `03${randomInRange(0, 3)}${randomInRange(10000000, 99999999)}`;
}

function generateFakeCNIC(): string {
  return `${randomInRange(10000, 99999)}-${randomInRange(1000000, 9999999)}-${randomInRange(1, 9)}`;
}

function generateFakeEmail(name: string): string {
  const nameParts = name.toLowerCase().split(' ');
  return `${nameParts[0]}.${nameParts[1]}${randomInRange(100, 999)}@example.com`;
}

function generateFakeEmployeeId(): string {
  return `EMP${randomInRange(1000, 9999)}`;
}

function generateFakeLicensePlate(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const plate = [
    letters[Math.floor(Math.random() * letters.length)],
    letters[Math.floor(Math.random() * letters.length)],
    randomInRange(100, 999),
    randomInRange(10, 99),
  ];
  return plate.join('');
}

function anonymizeData(exportedData: ExportedData): ExportedData {
  console.log('🔄 Anonymizing data...\n');

  const emailMap = new Map<string, string>();
  const phoneMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  const cnicMap = new Map<string, string>();

  // Anonymize employees table
  if (exportedData.tables.employees && exportedData.tables.employees.length > 0) {
    console.log('Anonymizing employees...');
    exportedData.tables.employees = exportedData.tables.employees.map((emp: any) => {
      const originalId = emp.employee_id;
      const fakeName = getRandomName();
      const fakeEmail = generateFakeEmail(fakeName);
      const fakePhone = generateFakePhone();
      const fakeCNIC = generateFakeCNIC();

      nameMap.set(originalId, fakeName);
      emailMap.set(originalId, fakeEmail);
      phoneMap.set(originalId, fakePhone);
      cnicMap.set(originalId, fakeCNIC);

      return {
        ...emp,
        employee_id: `EMP${randomInRange(10000, 99999)}`,
        full_name: fakeName,
        first_name: fakeName.split(' ')[0],
        last_name: fakeName.split(' ')[1] || '',
        email: fakeEmail,
        phone: fakePhone,
        mobileNumber: generateFakePhone(),
        personal_phone_number: generateFakePhone(),
        mobile_no: generateFakePhone(),
        personal_mobile_no: generateFakePhone(),
        cnic: fakeCNIC,
        cnic_no: fakeCNIC,
        government_id: `GOV${randomInRange(1000000, 9999999)}`,
        emergency_contact_name: getRandomName(),
        emergency_contact_number: generateFakePhone(),
        father_name: getRandomName(),
        address: `${randomInRange(100, 999)} Street, Islamabad`,
        address_line1: `${randomInRange(100, 999)} Street`,
        address_line2: `Sector ${randomInRange(1, 50)}`,
        city: ['Islamabad', 'Karachi', 'Lahore', 'Peshawar', 'Quetta'][Math.floor(Math.random() * 5)],
        password: 'DummyPassword123!', // Hash this in production
        bank_account_number: `${randomInRange(100000000000000, 999999999999999)}`,
        tax_id: `NTN${randomInRange(1000000, 9999999)}`,
      };
    });
  }

  // Anonymize users table
  if (exportedData.tables.users && exportedData.tables.users.length > 0) {
    console.log('Anonymizing users...');
    exportedData.tables.users = exportedData.tables.users.map((user: any) => ({
      ...user,
      email: `user${randomInRange(100, 999)}@example.com`,
      password: 'DummyPassword123!',
      full_name: getRandomName(),
    }));
  }

  // Anonymize clients table
  if (exportedData.tables.clients && exportedData.tables.clients.length > 0) {
    console.log('Anonymizing clients...');
    exportedData.tables.clients = exportedData.tables.clients.map((client: any) => ({
      ...client,
      client_id: `CLI${randomInRange(10000, 99999)}`,
      name: `${['ABC', 'XYZ', 'Global', 'Prime', 'Elite'][Math.floor(Math.random() * 5)]} Company ${randomInRange(100, 999)}`,
      email: `info${randomInRange(100, 999)}@company.com`,
      phone: generateFakePhone(),
      address: `${randomInRange(100, 999)} Business Street, Islamabad`,
    }));
  }

  // Anonymize client_sites table
  if (exportedData.tables.client_sites && exportedData.tables.client_sites.length > 0) {
    console.log('Anonymizing client sites...');
    exportedData.tables.client_sites = exportedData.tables.client_sites.map((site: any) => ({
      ...site,
      name: `Site-${randomInRange(1000, 9999)}`,
      address: `${randomInRange(100, 999)} Location Street`,
      city: ['Islamabad', 'Karachi', 'Lahore'][Math.floor(Math.random() * 3)],
    }));
  }

  // Anonymize vehicles table
  if (exportedData.tables.vehicles && exportedData.tables.vehicles.length > 0) {
    console.log('Anonymizing vehicles...');
    exportedData.tables.vehicles = exportedData.tables.vehicles.map((vehicle: any) => ({
      ...vehicle,
      vehicle_id: `VH${randomInRange(100000, 999999)}`,
      license_plate: generateFakeLicensePlate(),
      chassis_number: `CHASSIS${randomInRange(1000000, 9999999)}`,
      asset_tag: `AST${randomInRange(100000, 999999)}`,
    }));
  }

  // Anonymize attendance records
  if (exportedData.tables.attendance && exportedData.tables.attendance.length > 0) {
    console.log('Anonymizing attendance records...');
    exportedData.tables.attendance = exportedData.tables.attendance.map((att: any) => ({
      ...att,
      location: 'Site Location',
      picture: null,
      check_out_picture: null,
    }));
  }

  // Clear sensitive data from other tables
  if (exportedData.tables.employee_files && exportedData.tables.employee_files.length > 0) {
    console.log('Anonymizing employee files...');
    exportedData.tables.employee_files = exportedData.tables.employee_files.map((file: any) => ({
      ...file,
      file_path: '/files/anonymized',
      uploaded_by: 'system',
    }));
  }

  // Anonymize client contacts
  if (exportedData.tables.client_contacts && exportedData.tables.client_contacts.length > 0) {
    console.log('Anonymizing client contacts...');
    exportedData.tables.client_contacts = exportedData.tables.client_contacts.map((contact: any) => ({
      ...contact,
      name: getRandomName(),
      email: `contact${randomInRange(100, 999)}@company.com`,
      phone: generateFakePhone(),
    }));
  }

  // Anonymize site guard assignments
  if (exportedData.tables.site_guard_assignments && exportedData.tables.site_guard_assignments.length > 0) {
    console.log('Anonymizing site guard assignments...');
    exportedData.tables.site_guard_assignments = exportedData.tables.site_guard_assignments.map((assign: any) => ({
      ...assign,
      shift: ['Morning', 'Evening', 'Night'][Math.floor(Math.random() * 3)],
    }));
  }

  console.log('\n✅ Data anonymization completed!\n');
  return exportedData;
}

async function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0];

  if (!inputFile) {
    console.error('❌ Please provide the path to the export file');
    console.error('Usage: ts-node src/db/anonymize-data.ts <path-to-export-file>');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Reading export file: ${inputFile}`);
  const fileContent = fs.readFileSync(inputFile, 'utf-8');
  const exportedData: ExportedData = JSON.parse(fileContent);

  console.log(`📊 Original Data Summary:`);
  console.log(`   Total Records: ${exportedData.metadata.totalRecords}`);
  console.log(`   Tables: ${exportedData.metadata.tableCount}\n`);

  // Anonymize the data
  const anonymizedData = anonymizeData(exportedData);

  // Save anonymized data
  const outputFileName = `database-export-anonymized-${Date.now()}.json`;
  const outputPath = path.join(path.dirname(inputFile), outputFileName);

  fs.writeFileSync(outputPath, JSON.stringify(anonymizedData, null, 2));

  console.log(`💾 Anonymized data saved to: ${outputPath}`);
  console.log(`\n✨ Next step: Import this file to the new database`);
  console.log(`   npm run db:import -- ${outputPath}`);
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

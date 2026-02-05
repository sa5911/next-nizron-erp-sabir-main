import { Client } from 'pg';
import * as fs from 'fs';

const connectionString = process.argv[2];

if (!connectionString) {
  console.error('❌ Error: Please provide database connection string');
  process.exit(1);
}

async function createSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📝 Creating database schema...\n');

    // Create all tables
    const createTableQueries = [
      // Users & Roles
      `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          full_name TEXT,
          is_admin BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS permissions (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS users_to_roles (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, role_id)
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS roles_to_permissions (
          role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
          permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
          PRIMARY KEY (role_id, permission_id)
        );
      `,
      // Employees
      `
        CREATE TABLE IF NOT EXISTS employees (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          name TEXT,
          email TEXT UNIQUE,
          phone TEXT,
          position TEXT,
          department TEXT,
          hire_date DATE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      // Vehicles & Categories
      `
        CREATE TABLE IF NOT EXISTS vehicle_categories (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS vehicle_types (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          category_id INTEGER REFERENCES vehicle_categories(id)
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS vehicles (
          id SERIAL PRIMARY KEY,
          registration_number TEXT UNIQUE,
          name TEXT,
          type_id INTEGER REFERENCES vehicle_types(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      // Clients & Sites
      `
        CREATE TABLE IF NOT EXISTS industries (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          industry_id INTEGER REFERENCES industries(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS client_addresses (
          id SERIAL PRIMARY KEY,
          client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
          address TEXT
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS client_contacts (
          id SERIAL PRIMARY KEY,
          client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
          name TEXT,
          phone TEXT
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS client_sites (
          id SERIAL PRIMARY KEY,
          client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
          name TEXT,
          location TEXT
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS client_contracts (
          id SERIAL PRIMARY KEY,
          client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
          name TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      // Other core tables
      `
        CREATE TABLE IF NOT EXISTS company_settings (
          id SERIAL PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value TEXT
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES employees(id),
          date DATE,
          status TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS finance_accounts (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS finance_journal_entries (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES finance_accounts(id)
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS finance_journal_lines (
          id SERIAL PRIMARY KEY,
          entry_id INTEGER REFERENCES finance_journal_entries(id)
        );
      `,
    ];

    for (const query of createTableQueries) {
      try {
        await client.query(query);
        const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
        console.log(`✓ Created table: ${tableName}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error(`❌ Error creating table:`, error.message.split('\n')[0]);
        }
      }
    }

    console.log('\n✅ Schema created successfully!');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createSchema();

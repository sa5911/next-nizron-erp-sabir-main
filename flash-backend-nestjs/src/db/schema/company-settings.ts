import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().default('Flash Security Services'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  logo_url: text('logo_url'),
  r2_access_key_id: text('r2_access_key_id'),
  r2_secret_access_key: text('r2_secret_access_key'),
  r2_endpoint: text('r2_endpoint'),
  r2_bucket_name: text('r2_bucket_name'),
  r2_public_url_prefix: text('r2_public_url_prefix'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DRIZZLE } from '../../db/drizzle.module';
import * as schema from '../../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CloudStorageService } from '../../common/storage/cloud-storage.service';
import { sql } from 'drizzle-orm';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
    private cloudStorageService: CloudStorageService,
  ) {}

  // Run every 3 hours
  @Cron('0 0 */3 * * *')
  async handleCronBackup() {
    this.logger.log('Starting scheduled database backup (3-hour interval)...');
    try {
      await this.createAndUploadBackup();
      this.logger.log('Backup cycle completed successfully.');
    } catch (error) {
      this.logger.error(`Backup cycle failed: ${error.message}`);
    }
  }

  async createAndUploadBackup() {
    const backupData: Record<string, any> = {};
    const tables = [
      'users',
      'roles',
      'permissions',
      'employees',
      'employee_warnings',
      'vehicles',
      'vehicle_assignments',
      'vehicle_images',
      'vehicle_documents',
      'clients',
      'client_contracts',
      'attendance',
      'finance_accounts',
      'general_inventory_items',
      'restricted_inventory_items',
    ];

    for (const table of tables) {
      try {
        const result = await this.db.execute(sql.raw(`SELECT * FROM "${table}"`));
        backupData[table] = result.rows;
        this.logger.log(
          `Exported table: ${table} (${result.rows.length} rows)`,
        );
      } catch (e) {
        this.logger.warn(`Could not export table ${table}: ${e.message}`);
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const buffer = Buffer.from(JSON.stringify(backupData, null, 2));

    await this.cloudStorageService.uploadBackup(buffer, filename);
  }

  async cleanupOldBackups() {
    this.logger.log('Cleaning up backups older than 7 days...');
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const files = await this.cloudStorageService.listFiles('backups/');
    
    for (const file of files) {
      if (file.LastModified && new Date(file.LastModified) < oneWeekAgo) {
        this.logger.log(`Deleting old backup: ${file.Key}`);
        await this.cloudStorageService.deleteFile(file.Key);
      }
    }
  }
}

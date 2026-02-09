import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { DRIZZLE } from '../../db/drizzle.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';

const B2_CONFIG_DEFAULTS = {
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  bucketName: 'flash-erp',
  region: 'us-east-005',
};

@Injectable()
export class CloudStorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private endpoint: string;
  private publicUrlPrefix: string;
  private region: string;
  private readonly logger = new Logger(CloudStorageService.name);

  constructor(
    private configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {
    this.initializeFromEnv();
  }

  async onModuleInit() {
    try {
      await this.initializeFromDb();
    } catch (e) {
      this.logger.warn(`Could not load storage settings from DB: ${e.message}`);
    }
  }

  private initializeFromEnv() {
    // Check for Cloudflare R2 first, then Backblaze B2
    const r2AccessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const b2AccessKeyId =
      this.configService.get<string>('B2_APPLICATION_KEY_ID') ??
      this.configService.get<string>('B2_KEY_ID');

    const accessKeyId = r2AccessKeyId || b2AccessKeyId;

    const r2SecretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    const b2SecretAccessKey = this.configService.get<string>(
      'B2_APPLICATION_KEY',
    );
    const secretAccessKey = r2SecretAccessKey || b2SecretAccessKey;

    const r2BucketName = this.configService.get<string>('R2_BUCKET_NAME');
    const b2BucketName =
      this.configService.get<string>('B2_BUCKET_NAME') ??
      B2_CONFIG_DEFAULTS.bucketName;
    this.bucketName = r2BucketName || b2BucketName;

    const r2Endpoint = this.configService.get<string>('R2_ENDPOINT');
    const b2Endpoint =
      this.configService.get<string>('B2_ENDPOINT') ??
      B2_CONFIG_DEFAULTS.endpoint;
    this.endpoint = r2Endpoint || b2Endpoint;

    const r2Region = this.configService.get<string>('R2_REGION') ?? 'auto';
    const b2Region =
      this.configService.get<string>('B2_REGION') ?? B2_CONFIG_DEFAULTS.region;
    this.region = r2AccessKeyId ? r2Region : b2Region;

    this.publicUrlPrefix =
      this.configService.get<string>('R2_PUBLIC_URL_PREFIX') ||
      this.configService.get<string>('STORAGE_PUBLIC_URL_PREFIX');

    const provider = r2AccessKeyId ? 'Cloudflare R2' : 'Backblaze B2';

    if (!accessKeyId || !secretAccessKey || !this.bucketName || !this.endpoint) {
      this.logger.warn(
        `Missing required Cloud Storage configuration (${provider}). Cloud uploads will be disabled until configured in UI.`,
      );
      return;
    }

    try {
      this.s3Client = new S3Client({
        endpoint: this.endpoint,
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        // Essential for R2 and B2 S3 compatibility
        forcePathStyle: true,
      });

      this.logger.log(
        `Cloud Storage (${provider} S3) initialized from ENV. Bucket: ${this.bucketName}`,
      );
    } catch (error) {
      this.logger.error(`Failed to initialize S3 client: ${error.message}`);
    }
  }

  async initializeFromDb() {
    const settings = await this.db
      .select()
      .from(schema.companySettings)
      .limit(1);
    if (settings.length > 0) {
      const s = settings[0];
      if (s.r2_access_key_id && s.r2_secret_access_key) {
        this.bucketName = s.r2_bucket_name || this.bucketName;
        this.endpoint = s.r2_endpoint || this.endpoint;
        this.publicUrlPrefix = s.r2_public_url_prefix || this.publicUrlPrefix;

        this.s3Client = new S3Client({
          endpoint: this.endpoint,
          region: this.region || 'auto',
          credentials: {
            accessKeyId: s.r2_access_key_id,
            secretAccessKey: s.r2_secret_access_key,
          },
          forcePathStyle: true,
        });
        this.logger.log('Cloud storage initialized from database settings');
      }
    }
  }

  private uuidModulePromise: Promise<typeof import('uuid')> | null = null;

  private async loadUuidModule() {
    // Use runtime dynamic import to avoid require() on ESM uuid after compilation to CJS
    if (!this.uuidModulePromise) {
      const dynamicImport = new Function('specifier', 'return import(specifier);');
      this.uuidModulePromise = dynamicImport('uuid') as Promise<typeof import('uuid')>;
    }
    return this.uuidModulePromise;
  }

  private async generateUuid(): Promise<string> {
    const { v4 } = await this.loadUuidModule();
    return v4();
  }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    subDir?: string,
  ): Promise<{ filename: string; url: string }> {
    const ext = filename.split('.').pop() || '';
    const uniqueFilename = `${await this.generateUuid()}.${ext}`;
    const key = subDir ? `${subDir}/${uniqueFilename}` : uniqueFilename;

    if (!this.s3Client) {
      this.logger.error('Cloud Storage not configured. Please set credentials in Settings UI or .env file.');
      throw new Error('Cloud Storage (R2/S3) is not configured. Please provide credentials in Settings.');
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
        }),
      );

      // Construct URL.
      // If publicUrlPrefix is provided (common for R2), use it.
      // Otherwise fallback to S3 endpoint style.
      let url: string;
      if (this.publicUrlPrefix) {
        // Ensure prefix doesn't end with slash if key starts with one, or vice versa
        const prefix = this.publicUrlPrefix.endsWith('/')
          ? this.publicUrlPrefix.slice(0, -1)
          : this.publicUrlPrefix;
        url = `${prefix}/${key}`;
      } else {
        url = `${this.endpoint}/${this.bucketName}/${key}`;
      }

      this.logger.log(`File uploaded successfully. Key: ${key}`);
      this.logger.log(`Generated URL: ${url}`);
      return { filename: uniqueFilename, url };
    } catch (error) {
      this.logger.error(`Failed to upload to cloud storage: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client) {
       // Local delete
       try {
           const fs = await import('fs');
           const path = await import('path');
           const filePath = path.join(process.cwd(), 'uploads', key);
           if (fs.existsSync(filePath)) {
               fs.unlinkSync(filePath);
               this.logger.log(`Local file deleted: ${key}`);
           }
       } catch(e) {
           this.logger.warn(`Failed to delete local file: ${e.message}`);
       }
       return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
    }
  }

  async listFiles(prefix?: string): Promise<any[]> {
    if (!this.s3Client) return [];
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });
      const response = await this.s3Client.send(command);
      return response.Contents || [];
    } catch (error) {
      this.logger.error(`Failed to list files: ${error.message}`);
      return [];
    }
  }

  async uploadBackup(buffer: Buffer, filename: string): Promise<void> {
    if (!this.s3Client) return;
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: `backups/${filename}`,
          Body: buffer,
          ContentType: 'application/json',
        }),
      );
      this.logger.log(`Backup uploaded successfully: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to upload backup: ${error.message}`);
    }
  }

  /**
   * Helper to extract key from URL if needed
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      // Case 1: URL starts with publicUrlPrefix
      if (this.publicUrlPrefix) {
        const prefix = this.publicUrlPrefix.endsWith('/')
          ? this.publicUrlPrefix
          : `${this.publicUrlPrefix}/`;
        if (url.startsWith(prefix)) {
          return url.replace(prefix, '');
        }
      }

      // Case 2: Standard S3 path style URL (contains bucket name)
      if (url.includes(`${this.bucketName}/`)) {
        const parts = url.split(`${this.bucketName}/`);
        return parts.length > 1 ? parts[1] : null;
      }

      // Fallback: try to get everything after the last known separator
      // This is risky but might work for local files or other simple cases
      if (url.includes('/uploads/')) {
        return url.split('/uploads/')[1];
      }

      return null;
    } catch {
      return null;
    }
  }
}

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudStorageService } from './cloud-storage.service';
import { DrizzleModule } from '../../db/drizzle.module';

@Global()
@Module({
  imports: [ConfigModule, DrizzleModule],
  providers: [CloudStorageService],
  exports: [CloudStorageService],
})
export class StorageModule {}

import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}

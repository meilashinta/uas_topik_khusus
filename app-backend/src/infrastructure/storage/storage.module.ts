import { Module, Global } from '@nestjs/common';
import { IFileStorageServiceToken } from './storage.interface';
import { LocalStorageService } from './local-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: IFileStorageServiceToken,
      useClass: LocalStorageService,
    },
  ],
  exports: [IFileStorageServiceToken],
})
export class StorageModule {}

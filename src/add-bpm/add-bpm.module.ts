import { Module } from '@nestjs/common';
import { AddBpmService } from './add-bpm.service';
import { DatabaseService } from 'src/database/database.service';
import { S3Service } from 'src/s3/s3.service';

@Module({
  providers: [AddBpmService, DatabaseService, S3Service],
})
export class AddBpmModule {}

import { Module } from '@nestjs/common';
import { TrimTrackService } from './trim-track.service';
import { DatabaseService } from 'src/database/database.service';
import { S3Service } from 'src/s3/s3.service';
// import { ConfigService } from '@nestjs/config';

@Module({
  providers: [TrimTrackService, DatabaseService, S3Service],
})
export class TrimTrackModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrimTrackModule } from './trim-track/trim-track.module';
import { ConfigModule } from '@nestjs/config';
import { TrimTrackService } from './trim-track/trim-track.service';
// import { S3Service } from './s3/s3.service';
// import { DatabaseService } from './database/database.service';
// import { ConfigService } from '@nestjs/config';
import { S3Module } from './s3/s3.module';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { S3Service } from './s3/s3.service';
import { AddBpmModule } from './add-bpm/add-bpm.module';
import { AddBpmService } from './add-bpm/add-bpm.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      // Configuration options go here
      isGlobal: true, // Makes ConfigModule global
      envFilePath: '.env',
    }),
    TrimTrackModule,
    S3Module,
    DatabaseModule,
    AddBpmModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TrimTrackService,
    AddBpmService,
    DatabaseService,
    S3Service,
  ],
})
export class AppModule {}

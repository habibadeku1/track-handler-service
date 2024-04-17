import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Service {
  private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      region: configService.get('AWS_REGION'),
    });
  }

  async download(
    path: string,
    bucket = this.configService.get('AWS_BUCKET_NAME'),
  ): Promise<AWS.S3.GetObjectOutput> {
    const paramsGet: AWS.S3.Types.GetObjectRequest = {
      Bucket: bucket,
      Key: path,
    };

    try {
      return await this.s3.getObject(paramsGet).promise();
    } catch (e) {
      console.error(
        `path = ${path}
         bucket = ${bucket}
         `,
        e,
      );
      throw e;
    }
  }

  async upload(
    path: string,
    body: AWS.S3.Body,
    bucket = this.configService.get('AWS_BUCKET_NAME'),
  ): Promise<boolean> {
    const paramsPut: AWS.S3.Types.PutObjectRequest = {
      Bucket: bucket,
      Key: path,
      Body: body,
    };

    try {
      await this.s3.putObject(paramsPut).promise();
      return true;
    } catch (e) {
      console.error(
        `path = ${path}
         bucket = ${bucket}
         `,
        e,
      );
      throw e;
    }
  }

  // Example method to upload a file to S3
  //   async uploadFile(file: Express.Multer.File) {
  //     const uploadResult = await this.s3.upload({
  //       Bucket: this.configService.get('AWS_BUCKET_NAME'),
  //       Body: file.buffer,
  //       Key: `${Date.now()}-${file.originalname}`,
  //     }).promise();

  //     return uploadResult;
  //   }

  // Add more methods as needed...
}

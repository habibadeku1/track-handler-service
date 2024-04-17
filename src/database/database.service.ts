import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: mysql.Connection;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.connection = mysql.createConnection({
      host: this.configService.get('DATABASE_HOST'),
      port: parseInt(this.configService.get('DATABASE_PORT')),
      user: this.configService.get('DATABASE_USER'),
      password: this.configService.get('DATABASE_PASSWORD'),
      database: this.configService.get<string>('DATABASE_NAME'),
    });

    this.connection.connect((error) => {
      if (error) throw error;
      console.log('Successfully connected to the database.');
    });
  }

  onModuleDestroy() {
    this.connection.end((error) => {
      if (error) throw error;
      console.log('Closed database connection.');
    });
  }

  query(sql: string, args?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  }

  // Example usage
  async findAllUsers(): Promise<any> {
    const sql = 'SELECT * FROM users';
    return this.query(sql);
  }
}

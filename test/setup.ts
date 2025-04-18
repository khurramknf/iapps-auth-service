import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { seedTestData } from './seed';

let app: INestApplication;
let dataSource: DataSource;

export const getApp = () => app;
export const getDataSource = () => dataSource;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  dataSource = app.get(DataSource);
  
  await app.init();
  await seedTestData(dataSource);
});

afterAll(async () => {
  // Clean up test data
  await dataSource.getRepository('User').delete({});
  await app.close();
}); 
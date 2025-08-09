// File: services/auth-service/backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser'; // ✅ default import

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); // ✅ needed to read refresh cookie
  await app.listen(process.env.PORT || 3100);
}
bootstrap();
// File: services/auth-service/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module'; // custom module with validation
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Our custom ConfigModule already calls Nest ConfigModule.forRoot with validation.
    ConfigModule,
    AuthModule,
  ],
})
export class AppModule {}

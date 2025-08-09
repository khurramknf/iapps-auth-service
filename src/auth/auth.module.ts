// File: services/auth-service/backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { loadPrivateKey, loadPublicKey } from './jwt/keys.util';
import { JwksController } from './jwks/jwks.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const algorithm = config.get<string>('JWT_ALG') || 'RS256';
        const privateKey = loadPrivateKey();
        const publicKey = loadPublicKey();
        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: algorithm as any,
            expiresIn: config.get<string>('JWT_EXPIRES_IN') || '15m',
          },
        };
      },
    }),
  ],
  controllers: [AuthController, JwksController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtModule],
})
export class AuthModule {}

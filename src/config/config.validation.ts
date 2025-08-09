// File: services/auth-service/backend/src/config/config.validation.ts
import { plainToClass } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string;

  @IsOptional() @IsString()
  REDIS_HOST?: string;

  @IsOptional() @IsNumber()
  REDIS_PORT?: number;

  @IsOptional() @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional() @IsString()
  EMAIL_HOST?: string;

  @IsOptional() @IsNumber()
  EMAIL_PORT?: number;

  @IsOptional() @IsString()
  EMAIL_USER?: string;

  @IsOptional() @IsString()
  EMAIL_PASS?: string;

  @IsOptional() @IsString()
  EMAIL_FROM?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const isProd = validatedConfig.NODE_ENV === Environment.Production;

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: !isProd, // ✅ allow missing in dev/test
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  // ✅ apply sensible dev defaults if missing
  if (!isProd) {
    validatedConfig.REDIS_HOST ??= 'localhost';
    validatedConfig.REDIS_PORT ??= 6379;
    validatedConfig.REDIS_PASSWORD ??= '';
    validatedConfig.EMAIL_HOST ??= 'smtp.example.com';
    validatedConfig.EMAIL_PORT ??= 587;
    validatedConfig.EMAIL_USER ??= 'test@example.com';
    validatedConfig.EMAIL_PASS ??= 'changeme';
    validatedConfig.EMAIL_FROM ??= 'iApps Live <noreply@example.com>';
  }

  return validatedConfig;
}

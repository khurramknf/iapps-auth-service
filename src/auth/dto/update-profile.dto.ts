// File: services/auth-service/backend/src/auth/dto/update-profile.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

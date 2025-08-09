// File: services/auth-service/backend/src/auth/jwks/jwks.controller.ts
import { Controller, Get } from '@nestjs/common';
import { publicKeyToJwk } from '../jwt/keys.util';

@Controller('.well-known')
export class JwksController {
  @Get('jwks.json')
  jwks() {
    return publicKeyToJwk();
  }
}

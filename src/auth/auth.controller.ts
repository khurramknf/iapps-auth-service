// File: services/auth-service/backend/src/auth/auth.controller.ts

import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Put,
  Get,
  Logger,
  UnauthorizedException,
  HttpStatus,             // ✅ FIXED: missing import
  HttpException           // ✅ FIXED: missing import
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    this.logger.log(`🔐 Registering user: ${dto.email}`);
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    this.logger.log(`🔐 Login: Checking user by email: ${dto.email}`);
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(
    @Request() req,
    @Body() dto: ChangePasswordDto
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Missing user ID');
    }
    this.logger.log(`🔐 Attempting password change for user ID: ${userId}`);
    return this.authService.changePassword(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Request() req,
    @Body() dto: UpdateProfileDto
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    this.logger.log(`👤 Updating profile for user ID: ${userId}`);
    return this.authService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Missing user ID');
    }
    this.logger.log(`👤 Fetching profile for user ID: ${userId}`);
    return this.authService.getProfile(userId);
  }
}

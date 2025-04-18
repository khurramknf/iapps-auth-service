// File: services/auth-service/backend/src/auth/auth.service.ts

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly usersServiceUrl = 'http://localhost:3200/users';

  constructor(private readonly jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    try {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      this.logger.log('Password hashed');

      const res = await axios.post(`${this.usersServiceUrl}`, {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: 'user',
      });

      const user = res.data?.user;
      if (!user?.id) throw new InternalServerErrorException('User creation failed');

      const payload = { sub: user.id, email: user.email, role: user.role };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

      this.logger.log(`✅ Registered user: ${user.email}`);
      const { password, ...userWithoutPassword } = user;

      return {
        access_token,
        refresh_token,
        user: userWithoutPassword,
      };
    } catch (err: any) {
      this.logger.error('❌ Registration failed:', err?.response?.data || err.message);
      throw new ConflictException('Email already exists');
    }
  }

  async login(dto: LoginDto) {
    try {
      this.logger.log(`🔐 Login: Checking user by email: ${dto.email}`);
      const res = await axios.get(`${this.usersServiceUrl}/email/${dto.email}`);
      const user = res.data?.user;

      if (!user) {
        this.logger.warn(`❌ User not found: ${dto.email}`);
        throw new UnauthorizedException('User not found');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`❌ Invalid password for: ${dto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { sub: user.id, email: user.email, role: user.role };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

      const { password, ...userWithoutPassword } = user;
      return {
        access_token,
        refresh_token,
        user: userWithoutPassword,
      };
    } catch (err: any) {
      this.logger.error('❌ Login failed:', err?.response?.data || err.message);
      if (err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Login failed');
    }
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    this.logger.log(`🔐 Attempting password change for user ID: ${userId}`);
    try {
      const userRes = await axios.get(`${this.usersServiceUrl}/${userId}`);
      const user = userRes.data?.user;

      if (!user) throw new UnauthorizedException('User not found');

      const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
      if (!isMatch) {
        this.logger.warn(`❌ Incorrect old password for user ID: ${userId}`);
        throw new UnauthorizedException('Incorrect old password');
      }

      const newHashed = await bcrypt.hash(dto.newPassword, 10);
      const updated = await axios.put(`${this.usersServiceUrl}/${userId}`, {
        password: newHashed,
      });

      this.logger.log('✅ Password updated successfully');
      return updated.data;
    } catch (err: any) {
      this.logger.error('❌ Error changing password:', err?.message || err);
      throw new InternalServerErrorException('Password update failed');
    }
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    this.logger.log(`👤 Updating profile for user ID: ${userId}`);
    try {
      const updated = await axios.put(`${this.usersServiceUrl}/${userId}`, {
        name: dto.name,
      });
      return updated.data;
    } catch (err: any) {
      this.logger.error('❌ Failed to update profile:', err?.message || err);
      throw new InternalServerErrorException('Profile update failed');
    }
  }
  
  async getProfile(userId: number) {
    this.logger.log(`👤 Fetching profile for user ID: ${userId}`);
    try {
      const res = await axios.get(`${this.usersServiceUrl}/${userId}`);
      return res.data?.user;
    } catch (err: any) {
      this.logger.error('❌ Failed to fetch profile:', err?.message || err);
      throw new InternalServerErrorException('Profile fetch failed');
    }
  }
}


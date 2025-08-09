// File: services/auth-service/backend/src/auth/auth.service.ts

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import axios, { AxiosError } from 'axios';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Response, Request as ExpressRequest, CookieOptions } from 'express';

type UsersServiceUser = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'user';
  password?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type AuthTokens = { access_token: string; refresh_token: string };
type AuthResponse = AuthTokens & { user: Omit<UsersServiceUser, 'password'> };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly usersServiceUrl = process.env.USERS_SERVICE_URL
    ? `${process.env.USERS_SERVICE_URL}/users`
    : 'http://localhost:3200/users';

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------- helpers

  private signAccessToken(payload: Record<string, any>) {
    return this.jwtService.signAsync(payload); // expiresIn from JwtModule
  }

  private signRefreshToken(payload: Record<string, any>) {
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    return this.jwtService.signAsync(payload, { expiresIn: refreshExpires });
  }

  private normalizeEmail(email: string) {
    return (email || '').trim().toLowerCase();
  }

  private stripPassword<T extends object>(u: T & { password?: string }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = u;
    return rest as Omit<T, 'password'>;
  }

  private mapAxiosError(err: AxiosError | any, fallback: Error): never {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || err?.message;
    this.logger.error(msg || fallback.message);

    if (status === 401) throw new UnauthorizedException('Invalid credentials');
    if (status === 409) throw new ConflictException('Email already exists');

    throw fallback;
  }

  // ---------- cookies

  get refreshCookieName() {
    return this.config.get<string>('REFRESH_COOKIE_NAME') || 'refresh_token';
  }

  private cookieOptions(): CookieOptions {
    const domain = this.config.get<string>('REFRESH_COOKIE_DOMAIN') || 'localhost';
    const secure = (this.config.get<string>('REFRESH_COOKIE_SECURE') || 'false') === 'true';

    // Express expects lowercase values for sameSite when string
    const sameSiteEnv = (this.config.get<string>('REFRESH_COOKIE_SAMESITE') || 'Lax').toLowerCase();
    const sameSite: CookieOptions['sameSite'] =
      sameSiteEnv === 'none' ? 'none' :
      sameSiteEnv === 'strict' ? 'strict' : 'lax';

    const opts: CookieOptions = {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/auth',
    };
    return opts;
  }

  setRefreshCookie(res: Response, token: string) {
    res.cookie(this.refreshCookieName, token, this.cookieOptions());
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie(this.refreshCookieName, this.cookieOptions());
  }

  getRefreshFromReq(req: ExpressRequest): string {
    const token = req.cookies?.[this.refreshCookieName];
    if (!token) throw new UnauthorizedException('Missing refresh token');
    return token;
  }

  // ---------- core flows

  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      const email = this.normalizeEmail(dto.email);

      const passwordHash = await bcrypt.hash(dto.password, 10);
      this.logger.log('🔐 Password hashed');

      const res = await axios.post(`${this.usersServiceUrl}`, {
        name: dto.name,
        email,
        password: passwordHash,
        role: 'user',
      });

      const user: UsersServiceUser = res.data?.user ?? res.data;
      if (!user?.id) throw new InternalServerErrorException('User creation failed');

      const payload = { sub: user.id, email: user.email, role: user.role };
      const access_token = await this.signAccessToken(payload);
      const refresh_token = await this.signRefreshToken(payload);

      this.logger.log(`✅ Registered user: ${user.email}`);

      return {
        access_token,
        refresh_token,
        user: this.stripPassword(user),
      };
    } catch (err: any) {
      this.mapAxiosError(err, new ConflictException('Registration failed'));
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      const email = this.normalizeEmail(dto.email);
      this.logger.log(`🔐 Login: Checking user by email: ${email}`);

      const res = await axios.get(`${this.usersServiceUrl}/email/${encodeURIComponent(email)}`);
      const user: UsersServiceUser = res.data?.user ?? res.data;

      if (!user?.id) {
        this.logger.warn(`❌ User not found: ${email}`);
        throw new UnauthorizedException('User not found');
      }

      const hash = (user as any).password as string | undefined;
      if (!hash) {
        this.logger.warn(`❌ No password hash on user record for: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const ok = await bcrypt.compare(dto.password, hash);
      if (!ok) {
        this.logger.warn(`❌ Invalid password for: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { sub: user.id, email: user.email, role: user.role };
      const access_token = await this.signAccessToken(payload);
      const refresh_token = await this.signRefreshToken(payload);

      return {
        access_token,
        refresh_token,
        user: this.stripPassword(user),
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      this.mapAxiosError(err, new InternalServerErrorException('Login failed'));
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken);
      const payload = { sub: decoded.sub, email: decoded.email, role: decoded.role };

      const access_token = await this.signAccessToken(payload);
      const refresh_token = await this.signRefreshToken(payload); // rotate

      return { access_token, refresh_token };
    } catch {
      this.logger.warn('❌ Invalid refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    this.logger.log(`🔐 Attempting password change for user ID: ${userId}`);
    try {
      const userRes = await axios.get(`${this.usersServiceUrl}/${userId}`);
      const user: UsersServiceUser & { password?: string } = userRes.data?.user ?? userRes.data;
      if (!user?.id) throw new UnauthorizedException('User not found');

      const hash = user.password || '';
      const isMatch = await bcrypt.compare(dto.oldPassword, hash);
      if (!isMatch) {
        this.logger.warn(`❌ Incorrect old password for user ID: ${userId}`);
        throw new UnauthorizedException('Incorrect old password');
      }

      const newHashed = await bcrypt.hash(dto.newPassword, 10);
      const updated = await axios.put(`${this.usersServiceUrl}/${userId}`, { password: newHashed });

      this.logger.log('✅ Password updated successfully');
      return updated.data;
    } catch (err: any) {
      this.mapAxiosError(err, new InternalServerErrorException('Password update failed'));
    }
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    this.logger.log(`👤 Updating profile for user ID: ${userId}`);
    try {
      const updated = await axios.put(`${this.usersServiceUrl}/${userId}`, {
        name: dto.name?.trim(),
      });
      return updated.data;
    } catch (err: any) {
      this.mapAxiosError(err, new InternalServerErrorException('Profile update failed'));
    }
  }

  async getProfile(userId: number) {
    this.logger.log(`👤 Fetching profile for user ID: ${userId}`);
    try {
      const res = await axios.get(`${this.usersServiceUrl}/${userId}`);
      return res.data?.user ?? res.data;
    } catch (err: any) {
      this.mapAxiosError(err, new InternalServerErrorException('Profile fetch failed'));
    }
  }
}

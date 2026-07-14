import { Injectable, ConflictException, BadRequestException, UnauthorizedException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { JwtTokenService } from './jwt-token.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!dept) {
      throw new BadRequestException('Department not found');
    }

    const defaultRole = await this.prisma.role.findUnique({ where: { name: RoleName.EMPLOYEE } });
    if (!defaultRole) {
      throw new Error('Default role not found in database');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        departmentId: dto.departmentId,
        roleId: defaultRole.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    return user;
  }

  async login(dto: LoginDto) {
    const rateLimitKey = `ratelimit:login:${dto.email}`;
    const attempts = await this.redisService.get(rateLimitKey);
    if (attempts && parseInt(attempts, 10) >= 5) {
      throw new HttpException('Too many login attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({ 
      where: { email: dto.email },
      include: { role: true }
    });
    
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.redisService.incr(rateLimitKey);
      await this.redisService.expire(rateLimitKey, 15 * 60); // 15 mins
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    await this.redisService.del(rateLimitKey);

    const payload = { userId: user.id, role: user.role.name, email: user.email };
    const accessToken = this.jwtTokenService.generateAccessToken(payload);
    const refreshToken = this.jwtTokenService.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      }
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    // 1. Verify token
    let payload: any;
    try {
      payload = this.jwtTokenService.verifyRefreshToken(dto.refreshToken);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Check blacklist
    const isBlacklisted = await this.redisService.get(`blacklist:${dto.refreshToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token is invalid or has been logged out');
    }

    // 3. Generate new tokens
    const newPayload = { userId: payload.userId, role: payload.role, email: payload.email };
    const newAccessToken = this.jwtTokenService.generateAccessToken(newPayload);
    const newRefreshToken = this.jwtTokenService.generateRefreshToken(newPayload);

    // 4. Blacklist old token (TTL 7 days)
    await this.redisService.set(`blacklist:${dto.refreshToken}`, 'true', 7 * 24 * 60 * 60);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(dto: RefreshTokenDto) {
    // We don't necessarily need to verify it perfectly here, just blacklist it so it can't be used
    try {
      this.jwtTokenService.verifyRefreshToken(dto.refreshToken);
      await this.redisService.set(`blacklist:${dto.refreshToken}`, 'true', 7 * 24 * 60 * 60);
    } catch (e) {
      // If it's already expired or invalid, we just ignore
    }
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    
    // Return success immediately to avoid email enumeration
    if (!user) {
      return { message: 'If that email is registered, a reset link will be sent.' };
    }

    // Rate limiting: 3 per hour
    const rateLimitKey = `ratelimit:forgot:${user.id}`;
    const attempts = await this.redisService.get(rateLimitKey);
    if (attempts && parseInt(attempts, 10) >= 3) {
      throw new HttpException('Too many requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Generate token and store in redis
    const resetToken = crypto.randomUUID();
    await this.redisService.set(`reset:${resetToken}`, user.id, 30 * 60); // 30 minutes

    await this.redisService.incr(rateLimitKey);
    await this.redisService.expire(rateLimitKey, 60 * 60); // 1 hour

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    await this.emailService.sendResetPasswordEmail(user.email, resetLink);

    return { message: 'If that email is registered, a reset link will be sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await this.redisService.get(`reset:${dto.token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Save to history & update user
    await this.prisma.$transaction(async (prisma) => {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });

      await this.savePasswordHistory(prisma, userId, hashedPassword);
    });

    // Invalidate token
    await this.redisService.del(`reset:${dto.token}`);

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Incorrect current password');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Check history
    await this.checkPasswordHistory(userId, dto.newPassword);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });

      await this.savePasswordHistory(prisma, userId, hashedPassword);
    });

    return { message: 'Password changed successfully' };
  }

  private async checkPasswordHistory(userId: string, plainNewPassword: string) {
    const histories = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    for (const history of histories) {
      if (await bcrypt.compare(plainNewPassword, history.passwordHash)) {
        throw new BadRequestException('New password cannot be the same as any of your last 3 passwords');
      }
    }
  }

  private async savePasswordHistory(prisma: any, userId: string, passwordHash: string) {
    await prisma.passwordHistory.create({
      data: { userId, passwordHash },
    });

    // Keep only last 3
    const histories = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 3,
    });

    if (histories.length > 0) {
      const idsToDelete = histories.map((h: any) => h.id);
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }
}

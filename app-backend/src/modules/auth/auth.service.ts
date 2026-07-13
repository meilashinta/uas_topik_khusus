import { Injectable, ConflictException, BadRequestException, UnauthorizedException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { JwtTokenService } from './jwt-token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtTokenService: JwtTokenService,
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
}

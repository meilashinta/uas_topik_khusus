import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;
  let redisMock: any;
  let jwtTokenMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
      },
    };
    redisMock = {
      get: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
    };
    jwtTokenMock = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };
    authService = new AuthService(prismaMock, redisMock, jwtTokenMock);
  });

  it('should block login if rate limit exceeded', async () => {
    redisMock.get.mockResolvedValue('5'); // 5 attempts

    await expect(authService.login({ email: 'test@test.com', password: 'pw' }))
      .rejects.toThrow(HttpException); // Expect Too Many Requests (HTTP 429)
      
    expect(redisMock.get).toHaveBeenCalledWith('ratelimit:login:test@test.com');
  });

  it('should increment rate limit on failed login', async () => {
    redisMock.get.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'test@test.com',
      passwordHash: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Password mismatch

    await expect(authService.login({ email: 'test@test.com', password: 'pw' }))
      .rejects.toThrow(UnauthorizedException);

    expect(redisMock.incr).toHaveBeenCalledWith('ratelimit:login:test@test.com');
    expect(redisMock.expire).toHaveBeenCalledWith('ratelimit:login:test@test.com', 900);
  });
});

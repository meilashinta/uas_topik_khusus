import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { EmailService } from '../email/email.service';
import { HttpException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;
  let redisMock: any;
  let jwtTokenMock: any;
  let emailMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      passwordHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prismaMock)),
    };
    redisMock = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
    };
    jwtTokenMock = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };
    emailMock = {
      sendResetPasswordEmail: jest.fn(),
    };
    
    authService = new AuthService(prismaMock, redisMock, jwtTokenMock, emailMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.department.findUnique.mockResolvedValue({ id: 'dep-1' });
      prismaMock.role.findUnique.mockResolvedValue({ id: 'r1', name: 'EMPLOYEE' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPw');
      prismaMock.user.create.mockResolvedValue({ id: '1', email: 'test@example.com' });

      const dto = {
        name: 'Test',
        email: 'test@example.com',
        password: 'Password123!',
        departmentId: 'dep-1'
      };

      const result = await authService.register(dto);
      expect(result.id).toBe('1');
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should throw error if email exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '1' });
      await expect(authService.register({
        name: 'Test',
        email: 'test@example.com',
        password: 'Password123!',
        departmentId: 'dep-1'
      })).rejects.toThrow(HttpException); // 409 Conflict
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: 'hash',
        role: { name: 'EMPLOYEE' },
        isActive: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtTokenMock.generateAccessToken.mockReturnValue('acc');
      jwtTokenMock.generateRefreshToken.mockReturnValue('ref');

      const result = await authService.login({ email: 'test@test.com', password: 'pw' });
      
      expect(result.accessToken).toBe('acc');
      expect(redisMock.del).toHaveBeenCalledWith('ratelimit:login:test@test.com');
    });

    it('should throw if user inactive', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({
        isActive: false,
      });

      await expect(authService.login({ email: 'test@test.com', password: 'pw' }))
        .rejects.toThrow(HttpException); // 403 Forbidden
    });
  });

  describe('Forgot Password', () => {
    it('should send email if user exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
      
      const result = await authService.forgotPassword({ email: 'test@test.com' });
      
      expect(result.message).toContain('If that email is registered, a reset link will be sent.');
      expect(redisMock.set).toHaveBeenCalled();
      expect(emailMock.sendResetPasswordEmail).toHaveBeenCalled();
    });
  });

  describe('Reset Password', () => {
    it('should reset password successfully', async () => {
      redisMock.get.mockResolvedValue('test@test.com');
      prismaMock.user.findUnique.mockResolvedValue({ id: '1' });
      prismaMock.passwordHistory.findMany.mockResolvedValue([]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');

      const result = await authService.resetPassword({ token: 'abc', newPassword: 'NewPassword123!' });
      
      expect(result.message).toBe('Password has been reset successfully');
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(redisMock.del).toHaveBeenCalledWith('reset:abc');
    });
  });

  describe('Login Rate Limit', () => {
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
        role: { name: 'EMPLOYEE' },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Password mismatch

      await expect(authService.login({ email: 'test@test.com', password: 'pw' }))
        .rejects.toThrow(UnauthorizedException);

      expect(redisMock.incr).toHaveBeenCalledWith('ratelimit:login:test@test.com');
      expect(redisMock.expire).toHaveBeenCalledWith('ratelimit:login:test@test.com', 900);
    });
  });

  describe('Refresh Token', () => {
    it('should throw error if refresh token is in blacklist', async () => {
      jwtTokenMock.verifyRefreshToken.mockReturnValue({ userId: '1' });
      redisMock.get.mockResolvedValue('true'); // Is blacklisted

      await expect(authService.refreshToken({ refreshToken: 'oldToken' }))
        .rejects.toThrow(UnauthorizedException);
      
      expect(redisMock.get).toHaveBeenCalledWith('blacklist:oldToken');
    });

    it('should generate new tokens and blacklist old token on success', async () => {
      jwtTokenMock.verifyRefreshToken.mockReturnValue({ userId: '1', role: 'EMPLOYEE', email: 'test@test.com' });
      redisMock.get.mockResolvedValue(null); // Not blacklisted
      jwtTokenMock.generateAccessToken.mockReturnValue('newAccess');
      jwtTokenMock.generateRefreshToken.mockReturnValue('newRefresh');

      const result = await authService.refreshToken({ refreshToken: 'oldToken' });

      expect(result.accessToken).toBe('newAccess');
      expect(result.refreshToken).toBe('newRefresh');
      expect(redisMock.set).toHaveBeenCalledWith('blacklist:oldToken', 'true', expect.any(Number));
    });
  });

  describe('Logout', () => {
    it('should blacklist the refresh token', async () => {
      jwtTokenMock.verifyRefreshToken.mockReturnValue({ userId: '1' });
      
      const result = await authService.logout({ refreshToken: 'validToken' });
      
      expect(result.message).toBe('Logged out successfully');
      expect(redisMock.set).toHaveBeenCalledWith('blacklist:validToken', 'true', expect.any(Number));
    });
  });

  describe('Change Password', () => {
    it('should block if new password matches one of the last 3 passwords', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        passwordHash: 'currentHash',
      });
      (bcrypt.compare as jest.Mock).mockImplementation((plain, hash) => {
        // current password is correct
        if (plain === 'currentPw' && hash === 'currentHash') return true;
        // new password matches one of the histories
        if (plain === 'newPw' && hash === 'historyHash1') return true;
        return false;
      });

      prismaMock.passwordHistory.findMany.mockResolvedValue([
        { passwordHash: 'historyHash1' },
      ]);

      await expect(authService.changePassword('1', { currentPassword: 'currentPw', newPassword: 'newPw' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should update password and save history on success', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        passwordHash: 'currentHash',
      });
      (bcrypt.compare as jest.Mock).mockImplementation((plain, hash) => {
        if (plain === 'currentPw' && hash === 'currentHash') return true;
        return false;
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');

      prismaMock.passwordHistory.findMany.mockResolvedValue([]); // No matching history

      const result = await authService.changePassword('1', { currentPassword: 'currentPw', newPassword: 'newPw' });

      expect(result.message).toBe('Password changed successfully');
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { passwordHash: 'newHash' },
      });
      expect(prismaMock.passwordHistory.create).toHaveBeenCalledWith({
        data: { userId: '1', passwordHash: 'newHash' },
      });
    });
  });
});

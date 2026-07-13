import { JwtTokenService } from './jwt-token.service';
import { JwtService } from '@nestjs/jwt';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let jwtServiceMock: jest.Mocked<Partial<JwtService>>;

  beforeEach(() => {
    jwtServiceMock = {
      sign: jest.fn(),
      verify: jest.fn(),
    };
    service = new JwtTokenService(jwtServiceMock as any);
  });

  it('should generate access token', () => {
    jwtServiceMock.sign?.mockReturnValue('token');
    const result = service.generateAccessToken({ userId: '1', role: 'EMPLOYEE', email: 'test@example.com' });
    expect(result).toBe('token');
    expect(jwtServiceMock.sign).toHaveBeenCalledWith(
      { userId: '1', role: 'EMPLOYEE', email: 'test@example.com' },
      expect.objectContaining({ expiresIn: '15m' })
    );
  });

  it('should verify access token', () => {
    jwtServiceMock.verify?.mockReturnValue({ userId: '1' });
    const result = service.verifyAccessToken('token');
    expect(result.userId).toBe('1');
    expect(jwtServiceMock.verify).toHaveBeenCalledWith('token', expect.any(Object));
  });
});

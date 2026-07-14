import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    mockSendMail = jest.fn().mockResolvedValue(true);
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendResetPasswordEmail', () => {
    it('should send email with correct parameters', async () => {
      const email = 'test@example.com';
      const resetLink = 'http://localhost:3000/reset?token=123';

      await service.sendResetPasswordEmail(email, resetLink);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailArgs = mockSendMail.mock.calls[0][0];
      expect(mailArgs.to).toEqual(email);
      expect(mailArgs.subject).toContain('Reset Your Password');
      expect(mailArgs.html).toContain(resetLink);
    });

    it('should throw error if sending fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP Error'));

      await expect(service.sendResetPasswordEmail('test@example.com', 'link'))
        .rejects.toThrow('SMTP Error');
    });
  });
});

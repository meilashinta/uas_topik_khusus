import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendResetPasswordEmail(to: string, resetLink: string): Promise<void> {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Reset Password Request</h2>
        <p>You recently requested to reset your password for your account.</p>
        <p>Click the link below to reset it. This link will expire in 30 minutes.</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        <p>If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for the next 30 minutes.</p>
        <p>Thanks,<br>HelpDeskPro Team</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: '"HelpDeskPro" <noreply@helpdeskpro.local>',
        to,
        subject: 'Reset Your Password - HelpDeskPro',
        html: htmlTemplate,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      throw error;
    }
  }
}

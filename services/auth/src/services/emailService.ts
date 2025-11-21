import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { config } from '../config/config';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const transportOptions: SMTPTransport.Options = {
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    };

    this.transporter = nodemailer.createTransport(transportOptions);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Meeting Intelligence Suite" <${config.email.from}>`,
      to,
      subject: 'Password Reset Request',
      html: this.getPasswordResetTemplate(name, resetUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to: ${to}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email (optional - for future use)
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const mailOptions = {
      from: `"Meeting Intelligence Suite" <${config.email.from}>`,
      to,
      subject: 'Welcome to Meeting Intelligence Suite',
      html: this.getWelcomeTemplate(name),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to: ${to}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error for welcome email - it's not critical
    }
  }

  /**
   * Password Reset Email Template
   */
  private getPasswordResetTemplate(name: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; }
          .button { 
            display: inline-block; 
            background-color: #4F46E5; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for your Meeting Intelligence Suite account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 15 minutes</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>This is an automated email from Meeting Intelligence Suite</p>
            <p>© ${new Date().getFullYear()} Meeting Intelligence Suite. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Welcome Email Template (optional)
   */
  private getWelcomeTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Meeting Intelligence Suite! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for joining Meeting Intelligence Suite!</p>
            <p>You can now:</p>
            <ul>
              <li>📝 Transcribe meetings in real-time</li>
              <li>🤖 Get AI-powered insights and summaries</li>
              <li>👥 Collaborate with your team</li>
              <li>📊 Track commitments and action items</li>
            </ul>
            <p>Get started by creating your first meeting!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Meeting Intelligence Suite. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}


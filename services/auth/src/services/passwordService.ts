import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import redis from '../config/redis';
import { config } from '../config/config';
import { User } from '../models/User';
import { EmailService } from './emailService';

const emailService = new EmailService();

export class PasswordService {
  /**
   * Generate a secure random token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Request password reset - generates token and sends email
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return; // Still return success to prevent email enumeration
    }

    // Generate reset token
    const resetToken = this.generateResetToken();

    // Store token in Redis with expiry
    const redisKey = `password_reset:${resetToken}`;
    await redis.setex(
      redisKey,
      Math.floor(config.passwordResetTokenExpiry / 1000), // Convert ms to seconds for Redis
      user._id.toString()
    );

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
      console.log(`Password reset email sent to: ${user.email}`);
    } catch (error) {
      // Delete token from Redis if email fails
      await redis.del(redisKey);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Get user ID from Redis using token
    const redisKey = `password_reset:${token}`;
    const userId = await redis.get(redisKey);

    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Delete token from Redis (one-time use)
    await redis.del(redisKey);

    console.log(`Password reset successful for user: ${user.email}`);
  }

  /**
   * Verify if reset token is valid (optional - for frontend validation)
   */
  async verifyResetToken(token: string): Promise<boolean> {
    const redisKey = `password_reset:${token}`;
    const userId = await redis.get(redisKey);
    return !!userId;
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    console.log(`Password changed for user: ${user.email}`);
  }
}

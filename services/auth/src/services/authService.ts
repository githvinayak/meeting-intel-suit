import bcrypt from 'bcryptjs';
import { LoginInput, RegisterInput } from '../validators/authValidators';
import { User } from '../models/User';
import {
  deleteRefreshToken,
  generateTokenId,
  getRefreshToken,
  storeRefreshToken,
} from '../utils/token';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { EmailService } from './emailService';

interface UserResponse {
  _id: string;
  name: string;
  email: string;
  profilePic?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    profilePic?: string;
    role: string;
  };
}

export interface UpdateProfileInput {
  name?: string;
  profilePic?: string;
}

export interface UserProfileResponse {
  _id: string;
  name: string;
  email: string;
  role: string;
  profilePic?: string;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailService = new EmailService();
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async registerUser(userData: RegisterInput): Promise<UserResponse> {
    // ❗ Tests expect all DB errors to bubble naturally
    const hashedPassword = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

    const user = await User.create({
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      profilePic: userData.profilePic,
    });

    // Send welcome email (non-blocking - don't await)
    emailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
      logger.error('Failed to send welcome email:', error);
      // Don't throw - registration should succeed even if email fails
    });

    logger.info(`New user registered: ${user.email}`);

    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async login(credentials: LoginInput): Promise<LoginResponse> {
    const { email, password } = credentials;

    // 1. Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 3. Generate unique token ID
    const tokenId = generateTokenId();

    // 4. Generate access token (stateless)
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // 5. Generate refresh token (with tokenId)
    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      tokenId: tokenId,
    });

    // 6. Store refresh token in Redis
    await storeRefreshToken(user._id.toString(), refreshToken, tokenId);

    // 7. Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${user.email}`);

    // 8. Return tokens and sanitized user data
    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        profilePic: user.profilePic,
        role: user.role,
      },
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // 1. Verify the refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error: any) {
      logger.error('Refresh token verification failed:', error.message);
      throw new Error('Invalid or expired refresh token');
    }

    // 2. Extract userId and tokenId from decoded token
    const { userId, email, name, tokenId, role } = decoded;

    if (!tokenId) {
      logger.error('Refresh token missing tokenId');
      throw new Error('Invalid refresh token format');
    }

    // 3. Check if refresh token exists in Redis (not revoked)
    const storedToken = await getRefreshToken(userId, tokenId);

    if (!storedToken) {
      logger.warn(`Refresh token not found for user ${userId} with tokenId ${tokenId}`);
      throw new Error('Refresh token has been revoked or does not exist');
    }

    // 4. Verify stored token matches provided token
    if (storedToken !== refreshToken) {
      logger.warn(`Token mismatch for user ${userId}`);
      throw new Error('Invalid refresh token');
    }

    // 5. Delete old refresh token (token rotation - one-time use)
    await deleteRefreshToken(userId, tokenId);

    // 6. Generate new access token
    const newAccessToken = generateAccessToken({
      userId,
      email,
      name,
      role,
    });

    // 7. Generate new refresh token with new tokenId (rotation)
    const newTokenId = generateTokenId();
    const newRefreshToken = generateRefreshToken({
      userId,
      email,
      name,
      role,
      tokenId: newTokenId,
    });

    // 8. Store new refresh token in Redis
    await storeRefreshToken(userId, newRefreshToken, newTokenId);

    logger.info(`Token refreshed successfully for user: ${userId}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // 1. Verify the refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error: any) {
      logger.error('Logout - Invalid refresh token:', error.message);
      throw new Error('Invalid refresh token');
    }

    // 2. Extract userId and tokenId
    const { userId, tokenId } = decoded;

    if (!tokenId) {
      logger.error('Logout - Refresh token missing tokenId');
      throw new Error('Invalid refresh token format');
    }

    // 3. Delete refresh token from Redis
    await deleteRefreshToken(userId, tokenId);

    logger.info(`User logged out successfully: ${userId}`);
  }

  async getUserProfile(userId: string): Promise<UserProfileResponse | null> {
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return null;
    }

    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateProfileInput
  ): Promise<UserProfileResponse> {
    // Find user
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Update fields (only if provided)
    if (updates.name !== undefined) {
      user.name = updates.name;
    }

    if (updates.profilePic !== undefined) {
      user.profilePic = updates.profilePic;
    }

    // Save changes
    await user.save();

    logger.info(`Profile updated for user: ${user.email}`);

    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

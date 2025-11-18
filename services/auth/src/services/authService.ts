import bcrypt from 'bcryptjs';
import { LoginInput, RegisterInput } from '../validators/authValidators';
import { User } from '../models/User';
import { generateTokenId, storeRefreshToken } from '../utils/token';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';

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
    });

    // 5. Generate refresh token (with tokenId)
    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
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
}

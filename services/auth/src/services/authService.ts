import bcrypt from 'bcryptjs';
import { RegisterInput } from '../validators/authValidators';
import { User } from '../models/User';

interface UserResponse {
  _id: string;
  name: string;
  email: string;
  profilePic?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async registerUser(userData: RegisterInput): Promise<UserResponse> {
    const { name, email, password, profilePic } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User with this email already exists');
      (error as any).statusCode = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user data object
    const userCreateData: any = {
      name,
      email,
      password: hashedPassword,
    };

    // Only add profilePic if provided
    if (profilePic) {
      userCreateData.profilePic = profilePic;
    }

    const user = await User.create(userCreateData);

    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
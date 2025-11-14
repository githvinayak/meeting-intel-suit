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
}

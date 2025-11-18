import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'member' | 'author';
  profilePic?: string; // Optional field
  isEmailVerified: boolean;
  lastLogin?: Date; // Add this line
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'], // Changed from 6 to 8
    },
    role: {
      type: String,
      enum: ['member', 'author'],
      default: 'member',
    },
    profilePic: {
      type: String,
      default: 'https://ui-avatars.com/api/?background=random&name=User', // default avatar service
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      // Add this field
      type: Date,
    },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', userSchema);

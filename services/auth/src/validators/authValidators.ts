import { z } from 'zod';

// Password validation with detailed requirements
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character (!@#$%^&*)'
  )
  .refine(
    (password) => {
      // Additional checks for common weak passwords
      const weakPasswords = ['password', '1234567890', 'qwerty'];
      return !weakPasswords.some(weak => 
        password.toLowerCase().includes(weak)
      );
    },
    { message: 'Password is too common. Please choose a stronger password' }
  );

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .trim(),
  
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  
  password: passwordSchema,
  
  profilePic: z
    .string()
    .url('Profile picture must be a valid URL')
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
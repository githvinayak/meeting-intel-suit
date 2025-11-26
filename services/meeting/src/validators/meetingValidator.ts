import { z } from 'zod';

// Validation schemas using Zod
export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  fileUrl: z.string().url('Invalid URL').optional(),
  transcript: z.string().optional(),
  participants: z.array(
    z.object({
      userId: z.string().optional(),
      name: z.string().min(1, 'Participant name required'),
      email: z.string().email('Invalid email').optional(),
      role: z.string().optional()
    })
  ).optional(),
  scheduledAt: z.string().datetime().optional(),
  projectId: z.string().optional()
});

export const getMeetingParamsSchema = z.object({
  id: z.string().min(1, 'Meeting ID required')
});

export const listMeetingsQuerySchema = z.object({
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
  projectId: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  skip: z.string().transform(Number).pipe(z.number().min(0)).optional()
});
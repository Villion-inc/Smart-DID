import { z } from 'zod';

// Define VideoStatus enum values for Zod validation
const VideoStatusEnum = z.enum(['NONE', 'QUEUED', 'GENERATING', 'READY', 'FAILED']);

export const videoRequestSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
});

export const videoUpdateSchema = z.object({
  expiresAt: z.string().datetime().optional(),
  status: VideoStatusEnum.optional(),
});

export const videoStatusQuerySchema = z.object({
  status: VideoStatusEnum.optional(),
});

export type VideoRequestInput = z.infer<typeof videoRequestSchema>;
export type VideoUpdateInput = z.infer<typeof videoUpdateSchema>;
export type VideoStatusQueryInput = z.infer<typeof videoStatusQuerySchema>;

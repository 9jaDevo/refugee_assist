import { z } from 'zod';

export const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['clinic', 'shelter', 'legal', 'food', 'education', 'other']),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  phone: z.string()
    .min(1, 'Phone is required')
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email format'),
  website: z.string().url('Invalid URL format').optional().nullable(),
  hours: z.string().min(1, 'Hours of operation are required'),
  languages: z.array(z.string()).min(1, 'At least one language is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
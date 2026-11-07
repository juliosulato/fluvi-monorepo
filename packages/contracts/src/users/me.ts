import { z } from 'zod';

export const meResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

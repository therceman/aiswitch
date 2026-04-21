import { z } from 'zod';

export const ProfileSchema = z.object({
  executable: z.string().min(1),
  cwd: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  createDirs: z.array(z.string()).optional(),
});

export const ConfigSchema = z
  .object({
    version: z.literal(1),
    profiles: z.record(z.string(), ProfileSchema),
  })
  .refine((data) => Object.keys(data.profiles).length > 0, {
    message: 'At least one profile is required',
  });

export type Profile = z.infer<typeof ProfileSchema>;
export type Config = z.infer<typeof ConfigSchema>;

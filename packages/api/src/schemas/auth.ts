import { z } from 'zod';

// Shared by the login form (client validation) and anything else that needs it.
// Messages are i18n keys, translated at display time.
export const emailPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('auth.errors.invalidEmail'),
  password: z.string().min(1, 'auth.errors.passwordRequired'),
});

export type EmailPasswordInput = z.infer<typeof emailPasswordSchema>;

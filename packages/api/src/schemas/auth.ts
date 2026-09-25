import { z } from 'zod';

// Shared by the auth forms (client validation) and anything else that needs them.
// Messages are i18n keys, translated at display time.
const email = z.string().trim().toLowerCase().email('auth.errors.invalidEmail');
// Keep in sync with the minimum password length in Supabase Auth settings (backend-owned).
export const MIN_PASSWORD_LENGTH = 8;
const newPassword = z.string().min(MIN_PASSWORD_LENGTH, 'auth.errors.passwordTooShort');

export const emailPasswordSchema = z.object({
  email,
  password: z.string().min(1, 'auth.errors.passwordRequired'),
});

export const signUpSchema = z.object({ email, password: newPassword });

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: 'auth.errors.passwordsDontMatch',
    path: ['confirm'],
  });

export type EmailPasswordInput = z.infer<typeof emailPasswordSchema>;
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

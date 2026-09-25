import { emailPasswordSchema } from './auth';

describe('emailPasswordSchema', () => {
  it('normalizes email casing and whitespace', () => {
    const result = emailPasswordSchema.parse({ email: '  Rina@Example.COM ', password: 'x' });
    expect(result.email).toBe('rina@example.com');
  });

  it('rejects an invalid email with an i18n key', () => {
    const result = emailPasswordSchema.safeParse({ email: 'nope', password: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.invalidEmail');
  });

  it('requires a password', () => {
    const result = emailPasswordSchema.safeParse({ email: 'a@b.co', password: '' });
    expect(result.success).toBe(false);
  });
});

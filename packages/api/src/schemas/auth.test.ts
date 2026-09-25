import { emailPasswordSchema, newPasswordSchema, signUpSchema } from './auth';

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

describe('signUpSchema', () => {
  it('asks for a longer password with an i18n key', () => {
    const result = signUpSchema.safeParse({ email: 'a@b.co', password: 'short' });
    expect(result.error?.issues[0]?.message).toBe('auth.errors.passwordTooShort');
  });
});

describe('newPasswordSchema', () => {
  it('flags a mismatched confirmation on the confirm field', () => {
    const result = newPasswordSchema.safeParse({ password: 'long-enough', confirm: 'different' });
    expect(result.error?.issues[0]?.path).toEqual(['confirm']);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.passwordsDontMatch');
  });
});

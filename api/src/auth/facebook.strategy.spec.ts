import { ConfigService } from '@nestjs/config';
import { FacebookStrategy } from './facebook.strategy';
import { AuthService } from './auth.service';

const mockConfig = (key: string) => {
  const values: Record<string, string> = {
    FACEBOOK_AUTH_URL: 'http://localhost:8080/authorize',
    FACEBOOK_TOKEN_URL: 'http://localhost:8080/token',
    FACEBOOK_APP_ID: 'mock-facebook-client-id',
    FACEBOOK_APP_SECRET: 'mock-client-secret',
    FACEBOOK_CALLBACK_URL: 'http://localhost:3001/auth/callback/facebook',
    FACEBOOK_USERINFO_URL: 'http://localhost:8080/userinfo',
  };
  if (!(key in values)) throw new Error(`Missing config key: ${key}`);
  return values[key];
};

const mockAuthService = { login: jest.fn() };

const makeStrategy = () =>
  new FacebookStrategy(
    { getOrThrow: mockConfig } as unknown as ConfigService,
    mockAuthService as unknown as AuthService,
  );

describe('FacebookStrategy', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns auth result on valid userinfo response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest
        .fn()
        .mockResolvedValue({ sub: 'fb-001', email: 'user@example.com' }),
    }) as any;
    mockAuthService.login.mockResolvedValue({ access_token: 'token', user: {} });

    const strategy = makeStrategy();
    const result = await strategy.validate('access-token');

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      provider: 'facebook',
      providerId: 'fb-001',
    });
    expect(result.access_token).toBe('token');
  });

  it('falls back to sub when email is missing from userinfo', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ sub: 'fb-001' }),
    }) as any;
    mockAuthService.login.mockResolvedValue({ access_token: 'token', user: {} });

    const strategy = makeStrategy();
    await strategy.validate('access-token');

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'fb-001',
      provider: 'facebook',
      providerId: 'fb-001',
    });
  });

  it('returns __error when both email and sub are missing from userinfo', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({}),
    }) as any;
    mockAuthService.login.mockRejectedValue(new Error('Invalid profile'));

    const strategy = makeStrategy();
    const result = await strategy.validate('access-token');

    expect(result).toHaveProperty('__error');
  });

  it('returns __error object when login throws', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest
        .fn()
        .mockResolvedValue({ sub: 'fb-001', email: 'user@example.com' }),
    }) as any;
    mockAuthService.login.mockRejectedValue(
      new Error('Account exists with different provider'),
    );

    const strategy = makeStrategy();
    const result = await strategy.validate('access-token');

    expect(result).toEqual({
      __error: 'Account exists with different provider',
    });
  });

  it('returns __error when fetch throws a network error', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('Network error')) as any;

    const strategy = makeStrategy();
    const result = await strategy.validate('access-token');

    expect(result).toHaveProperty('__error');
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });
});

import { ConfigService } from '@nestjs/config';
import { XStrategy } from './x.strategy';
import { AuthService } from './auth.service';

const mockConfig = (key: string) => {
  const values: Record<string, string> = {
    X_AUTH_URL: 'http://localhost:8080/authorize',
    X_TOKEN_URL: 'http://localhost:8080/token',
    X_API_KEY: 'mock-x-client-id',
    X_API_SECRET: 'mock-client-secret',
    X_CALLBACK_URL: 'http://localhost:3001/auth/callback/x',
    X_USERINFO_URL: 'http://localhost:8080/userinfo',
  };
  if (!(key in values)) throw new Error(`Missing config key: ${key}`);
  return values[key];
};

const mockAuthService = { login: jest.fn() };

const makeStrategy = () =>
  new XStrategy(
    { getOrThrow: mockConfig } as unknown as ConfigService,
    mockAuthService as unknown as AuthService,
  );

describe('XStrategy', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns auth result on valid userinfo response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest
        .fn()
        .mockResolvedValue({ sub: 'x-001', email: 'user@example.com' }),
    }) as any;
    mockAuthService.login.mockResolvedValue({ access_token: 'token', user: {} });

    const strategy = makeStrategy();
    const result = await strategy.validate('access-token');

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      provider: 'x',
      providerId: 'x-001',
    });
    expect(result.access_token).toBe('token');
  });

  it('falls back to sub when email is missing from userinfo', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ sub: 'x-001' }),
    }) as any;
    mockAuthService.login.mockResolvedValue({ access_token: 'token', user: {} });

    const strategy = makeStrategy();
    await strategy.validate('access-token');

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'x-001',
      provider: 'x',
      providerId: 'x-001',
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
        .mockResolvedValue({ sub: 'x-001', email: 'user@example.com' }),
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

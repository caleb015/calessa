import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const authedReq = (overrides = {}) => ({
  user: { userId: 'user-123', email: 'test@example.com', name: 'Test User', hasPassword: true },
  ...overrides,
});

const mockRes = () => ({ redirect: jest.fn() });

const mockAuthService = {
  register: jest.fn(),
  validateUser: jest.fn(),
  login: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
};

const mockUsersService = {
  getById: jest.fn(),
  getByEmail: jest.fn(),
  getLinkedProviders: jest.fn(),
  unlinkProvider: jest.fn(),
  deleteUser: jest.fn(),
  linkProvider: jest.fn(),
  getByProvider: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('state-token'),
  verify: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = moduleRef.get<AuthController>(AuthController);
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue('test-secret');
    mockJwtService.sign.mockReturnValue('state-token');
  });

  // ── me ──────────────────────────────────────────────────────────────────────

  describe('me', () => {
    it('returns user with createdAt from DB', async () => {
      mockUsersService.getById.mockResolvedValue(mockUser);
      const result = await controller.me(authedReq() as any);
      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        hasPassword: true,
        createdAt: mockUser.createdAt,
      });
    });

    it('throws UnauthorizedException when user not found in DB', async () => {
      mockUsersService.getById.mockResolvedValue(null);
      await expect(controller.me(authedReq() as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── register ─────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('returns user without password field', async () => {
      mockAuthService.register.mockResolvedValue({ ...mockUser });
      const result = await controller.register({ email: 'test@example.com', password: 'password' } as any);
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com');
    });
  });

  // ── login ────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns access_token on valid credentials', async () => {
      mockAuthService.validateUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockAuthService.login.mockResolvedValue({ access_token: 'token', user: { email: 'test@example.com' } });
      const result = await controller.login({ email: 'test@example.com', password: 'password' } as any);
      expect(result.access_token).toBe('token');
    });

    it('throws UnauthorizedException on invalid credentials', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);
      await expect(
        controller.login({ email: 'test@example.com', password: 'wrong' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('returns updated user without password', async () => {
      mockAuthService.updateProfile.mockResolvedValue({ ...mockUser, name: 'New Name' });
      const result = await controller.updateProfile(authedReq() as any, { name: 'New Name' } as any);
      expect(result).not.toHaveProperty('password');
      expect(result.name).toBe('New Name');
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('returns success message', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);
      const result = await controller.changePassword(
        authedReq() as any,
        { currentPassword: 'old', newPassword: 'new12345' } as any,
      );
      expect(result).toEqual({ message: 'Password updated' });
    });
  });

  // ── getProviders ──────────────────────────────────────────────────────────────

  describe('getProviders', () => {
    it('returns provider and linkedAt only — omits providerId', async () => {
      const linkedAt = new Date();
      mockUsersService.getLinkedProviders.mockResolvedValue([
        { id: 'lp-1', userId: 'user-123', provider: 'google', providerId: 'g-001', linkedAt },
      ]);
      const result = await controller.getProviders(authedReq() as any);
      expect(result).toEqual([{ provider: 'google', linkedAt }]);
      expect(result[0]).not.toHaveProperty('providerId');
    });
  });

  // ── unlinkProvider ────────────────────────────────────────────────────────────

  describe('unlinkProvider', () => {
    it('unlinks successfully when multiple providers exist', async () => {
      mockUsersService.getLinkedProviders.mockResolvedValue([
        { provider: 'google' }, { provider: 'facebook' },
      ]);
      mockUsersService.getByEmail.mockResolvedValue({ ...mockUser, password: null });
      await controller.unlinkProvider(authedReq() as any, 'google');
      expect(mockUsersService.unlinkProvider).toHaveBeenCalledWith('user-123', 'google');
    });

    it('unlinks when only one provider but user has a password', async () => {
      mockUsersService.getLinkedProviders.mockResolvedValue([{ provider: 'google' }]);
      mockUsersService.getByEmail.mockResolvedValue(mockUser);
      await controller.unlinkProvider(authedReq() as any, 'google');
      expect(mockUsersService.unlinkProvider).toHaveBeenCalled();
    });

    it('throws BadRequestException when removing the only login method', async () => {
      mockUsersService.getLinkedProviders.mockResolvedValue([{ provider: 'google' }]);
      mockUsersService.getByEmail.mockResolvedValue({ ...mockUser, password: null });
      await expect(controller.unlinkProvider(authedReq() as any, 'google')).rejects.toThrow(BadRequestException);
      expect(mockUsersService.unlinkProvider).not.toHaveBeenCalled();
    });
  });

  // ── deleteAccount ─────────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('calls deleteUser with the userId', async () => {
      mockUsersService.deleteUser.mockResolvedValue(undefined);
      await controller.deleteAccount(authedReq() as any);
      expect(mockUsersService.deleteUser).toHaveBeenCalledWith('user-123');
    });
  });

  // ── linkProvider ──────────────────────────────────────────────────────────────

  describe('linkProvider', () => {
    it('propagates error when JWT_SECRET is not configured', () => {
      mockConfigService.getOrThrow.mockImplementation(() => {
        throw new Error('Configuration key "JWT_SECRET" does not exist');
      });
      expect(() => controller.linkProvider(authedReq() as any, 'google')).toThrow('JWT_SECRET');
    });

    it('returns OAuth URL for a valid provider', () => {
      mockConfigService.get.mockImplementation((key: string) => ({
        GOOGLE_AUTH_URL: 'http://localhost:8080/authorize',
        GOOGLE_CLIENT_ID: 'mock-google-client-id',
        GOOGLE_LINK_CALLBACK_URL: 'http://localhost:3001/auth/link/callback/google',
      } as any)[key]);
      const result = controller.linkProvider(authedReq() as any, 'google') as any;
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('http://localhost:8080/authorize');
      expect(result.url).toContain('state=state-token');
    });

    it('throws BadRequestException for an unknown provider', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(() => controller.linkProvider(authedReq() as any, 'unknown')).toThrow(BadRequestException);
    });
  });

  // ── linkCallback ──────────────────────────────────────────────────────────────

  describe('linkCallback', () => {
    it('propagates error when JWT_SECRET is not configured', async () => {
      mockConfigService.get.mockReturnValue('http://localhost:3000');
      mockConfigService.getOrThrow.mockImplementation(() => {
        throw new Error('Configuration key "JWT_SECRET" does not exist');
      });
      const res = mockRes();
      await expect(
        controller.linkCallback(
          { query: { code: 'code', state: 'state' } } as any,
          res as any,
          'google',
        ),
      ).rejects.toThrow('JWT_SECRET');
    });

    const providerConfig = {
      FRONTEND_URL: 'http://localhost:3000',
      GOOGLE_TOKEN_URL: 'http://localhost:8080/token',
      GOOGLE_USERINFO_URL: 'http://localhost:8080/userinfo',
      GOOGLE_CLIENT_ID: 'mock-client-id',
      GOOGLE_CLIENT_SECRET: 'mock-secret',
      GOOGLE_LINK_CALLBACK_URL: 'http://localhost:3001/auth/link/callback/google',
    };

    const mockFetchExchange = (sub = 'google-001') => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve({ access_token: 'at' }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ sub, email: 'user@gmail.com' }) });
    };

    it('redirects to invalid_state when state JWT is invalid', async () => {
      mockConfigService.get.mockImplementation((k: string) => (providerConfig as any)[k]);
      mockJwtService.verify.mockImplementation(() => { throw new Error('expired'); });
      const res = mockRes();
      await controller.linkCallback(
        { query: { code: 'code', state: 'bad-state' } } as any,
        res as any,
        'google',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/profile?error=invalid_state',
      );
    });

    it('redirects to invalid_state when state purpose is wrong', async () => {
      mockConfigService.get.mockImplementation((k: string) => (providerConfig as any)[k]);
      mockJwtService.verify.mockReturnValue({ userId: 'user-123', purpose: 'not-link' });
      const res = mockRes();
      await controller.linkCallback(
        { query: { code: 'code', state: 'state' } } as any,
        res as any,
        'google',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/profile?error=invalid_state',
      );
    });

    it('redirects to provider_taken when provider is linked to a different user', async () => {
      mockConfigService.get.mockImplementation((k: string) => (providerConfig as any)[k]);
      mockJwtService.verify.mockReturnValue({ userId: 'user-123', purpose: 'link' });
      mockUsersService.getByProvider.mockResolvedValue({ id: 'other-user' });
      mockFetchExchange();
      const res = mockRes();
      await controller.linkCallback(
        { query: { code: 'code', state: 'state' } } as any,
        res as any,
        'google',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/profile?error=provider_taken',
      );
    });

    it('redirects to already_linked on P2002 constraint', async () => {
      mockConfigService.get.mockImplementation((k: string) => (providerConfig as any)[k]);
      mockJwtService.verify.mockReturnValue({ userId: 'user-123', purpose: 'link' });
      mockUsersService.getByProvider.mockResolvedValue(null);
      const p2002 = Object.assign(new Error('Unique'), { code: 'P2002' });
      mockUsersService.linkProvider.mockRejectedValue(p2002);
      mockFetchExchange();
      const res = mockRes();
      await controller.linkCallback(
        { query: { code: 'code', state: 'state' } } as any,
        res as any,
        'google',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/profile?error=already_linked',
      );
    });

    it('redirects with linked=provider on success', async () => {
      mockConfigService.get.mockImplementation((k: string) => (providerConfig as any)[k]);
      mockJwtService.verify.mockReturnValue({ userId: 'user-123', purpose: 'link' });
      mockUsersService.getByProvider.mockResolvedValue(null);
      mockUsersService.linkProvider.mockResolvedValue({});
      mockFetchExchange();
      const res = mockRes();
      await controller.linkCallback(
        { query: { code: 'code', state: 'state' } } as any,
        res as any,
        'google',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard/profile?linked=google',
      );
    });
  });
});

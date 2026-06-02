import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: null,
  password: 'hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUsersService = {
  validateLocalUser: jest.fn(),
  getById: jest.fn(),
  getByEmail: jest.fn(),
  getByProvider: jest.fn(),
  getLinkedProviders: jest.fn(),
  create: jest.fn(),
  createLocalUser: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── validateUser ────────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('returns user without password on valid local credentials', async () => {
      mockUsersService.validateLocalUser.mockResolvedValue(mockUser);
      const result = await service.validateUser('test@example.com', 'password');
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com');
    });

    it('returns null when local credentials are invalid', async () => {
      mockUsersService.validateLocalUser.mockResolvedValue(null);
      const result = await service.validateUser('test@example.com', 'wrong');
      expect(result).toBeNull();
    });

    it('returns null when user has no password set (OAuth user attempting local login)', async () => {
      mockUsersService.validateLocalUser.mockResolvedValue(null);
      const result = await service.validateUser('oauth@example.com', 'password');
      expect(result).toBeNull();
    });

    it('returns user by email when no password provided', async () => {
      mockUsersService.getByEmail.mockResolvedValue(mockUser);
      const result = await service.validateUser('test@example.com');
      expect(result).toEqual({ id: mockUser.id, email: mockUser.email });
    });

    it('returns null when email not found and no password provided', async () => {
      mockUsersService.getByEmail.mockResolvedValue(null);
      const result = await service.validateUser('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  // ── login (local path) ──────────────────────────────────────────────────────

  describe('login — local path (user has id)', () => {
    it('returns access_token and user when id is present', async () => {
      mockUsersService.getByEmail.mockResolvedValue(mockUser);
      const result = await service.login({
        id: 'user-123',
        email: 'test@example.com',
        provider: 'local',
      });
      expect(result.access_token).toBe('signed-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { email: 'test@example.com', name: null, hasPassword: true },
        { subject: 'user-123' },
      );
    });
  });

  // ── login (OAuth path) ──────────────────────────────────────────────────────

  describe('login — OAuth path (no id)', () => {
    it('returns existing user when found by provider', async () => {
      mockUsersService.getByProvider.mockResolvedValue(mockUser);
      const result = await service.login({
        email: 'test@example.com',
        provider: 'google',
        providerId: 'google-001',
      });
      expect(result.access_token).toBe('signed-token');
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('does not check email when provider match is found', async () => {
      mockUsersService.getByProvider.mockResolvedValue(mockUser);
      await service.login({
        email: 'test@example.com',
        provider: 'google',
        providerId: 'google-001',
      });
      expect(mockUsersService.getByEmail).not.toHaveBeenCalled();
    });

    it('creates a new user when provider and email are both new', async () => {
      mockUsersService.getByProvider.mockResolvedValue(null);
      mockUsersService.getByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      const result = await service.login({
        email: 'new@example.com',
        provider: 'google',
        providerId: 'google-002',
      });
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        provider: 'google',
        providerId: 'google-002',
      });
      expect(result.access_token).toBe('signed-token');
    });

    it('defaults providerId to empty string when omitted', async () => {
      mockUsersService.getByProvider.mockResolvedValue(null);
      mockUsersService.getByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      await service.login({ email: 'new@example.com', provider: 'google' });
      expect(mockUsersService.getByProvider).toHaveBeenCalledWith('google', '');
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: '' }),
      );
    });

    it('throws ConflictException when email exists under a different provider', async () => {
      mockUsersService.getByProvider.mockResolvedValue(null);
      mockUsersService.getByEmail.mockResolvedValue(mockUser);
      await expect(
        service.login({
          email: 'test@example.com',
          provider: 'facebook',
          providerId: 'fb-001',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('conflict error message does not reveal which provider the account uses', async () => {
      mockUsersService.getByProvider.mockResolvedValue(null);
      mockUsersService.getByEmail.mockResolvedValue(mockUser);
      await expect(
        service.login({
          email: 'test@example.com',
          provider: 'facebook',
          providerId: 'fb-001',
        }),
      ).rejects.toThrow('method you originally used');
    });
  });

  // ── updateProfile ───────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('delegates to usersService.updateProfile and returns the user', async () => {
      const updated = { ...mockUser, name: 'New Name' };
      mockUsersService.updateProfile.mockResolvedValue(updated);
      const result = await service.updateProfile('user-123', 'New Name');
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith('user-123', { name: 'New Name' });
      expect(result).toEqual(updated);
    });
  });

  // ── changePassword ──────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('updates password when current password is correct', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockUsersService.getById.mockResolvedValue({ ...mockUser, password: hashed });
      mockUsersService.updatePassword.mockResolvedValue(mockUser);
      await service.changePassword('user-123', 'correct', 'newpassword');
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        'user-123',
        expect.stringMatching(/^\$2[ab]\$\d+\$/),
      );
    });

    it('throws BadRequestException when current password is incorrect', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockUsersService.getById.mockResolvedValue({ ...mockUser, password: hashed });
      await expect(
        service.changePassword('user-123', 'wrong', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when user has no password set', async () => {
      mockUsersService.getById.mockResolvedValue({ ...mockUser, password: null });
      await expect(
        service.changePassword('user-123', 'anything', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when user is not found', async () => {
      mockUsersService.getById.mockResolvedValue(null);
      await expect(
        service.changePassword('user-123', 'anything', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });

    it('hashes the new password before storing', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockUsersService.getById.mockResolvedValue({ ...mockUser, password: hashed });
      mockUsersService.updatePassword.mockResolvedValue(mockUser);
      await service.changePassword('user-123', 'correct', 'newpassword');
      const stored = mockUsersService.updatePassword.mock.calls[0][1];
      expect(stored).not.toBe('newpassword');
      expect(stored).toMatch(/^\$2[ab]\$\d+\$/);
    });
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('delegates to createLocalUser', async () => {
      mockUsersService.createLocalUser.mockResolvedValue(mockUser);
      const result = await service.register('test@example.com', 'password');
      expect(mockUsersService.createLocalUser).toHaveBeenCalledWith(
        'test@example.com',
        'password',
      );
      expect(result).toEqual(mockUser);
    });

    it('propagates error when email is already registered', async () => {
      mockUsersService.createLocalUser.mockRejectedValue(
        new Error('Unique constraint failed'),
      );
      await expect(
        service.register('test@example.com', 'password'),
      ).rejects.toThrow('Unique constraint failed');
    });
  });
});

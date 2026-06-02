import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: null,
  password: '$2b$10$hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  linkedProvider: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = moduleRef.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── getByEmail ──────────────────────────────────────────────────────────────

  describe('getByEmail', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.getByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  // ── getByProvider ───────────────────────────────────────────────────────────

  describe('getByProvider', () => {
    it('returns user when found via LinkedProvider', async () => {
      mockPrisma.linkedProvider.findUnique.mockResolvedValue({ user: mockUser });
      const result = await service.getByProvider('google', 'google-001');
      expect(result).toEqual(mockUser);
      expect(mockPrisma.linkedProvider.findUnique).toHaveBeenCalledWith({
        where: { provider_providerId: { provider: 'google', providerId: 'google-001' } },
        include: { user: true },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.linkedProvider.findUnique.mockResolvedValue(null);
      const result = await service.getByProvider('google', 'unknown-id');
      expect(result).toBeNull();
    });
  });

  // ── createLocalUser ─────────────────────────────────────────────────────────

  describe('createLocalUser', () => {
    it('hashes the password before storing', async () => {
      mockPrisma.user.create.mockResolvedValue(mockUser);
      await service.createLocalUser('test@example.com', 'plaintext');
      const storedPassword = mockPrisma.user.create.mock.calls[0][0].data.password;
      expect(storedPassword).not.toBe('plaintext');
      expect(storedPassword).toMatch(/^\$2[ab]\$\d+\$/);
    });

    it('creates a local LinkedProvider entry', async () => {
      mockPrisma.user.create.mockResolvedValue(mockUser);
      await service.createLocalUser('test@example.com', 'password');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            linkedProviders: expect.objectContaining({
              create: expect.objectContaining({ provider: 'local' }),
            }),
          }),
        }),
      );
    });

    it('propagates error on duplicate email', async () => {
      mockPrisma.user.create.mockRejectedValue(new Error('Unique constraint failed'));
      await expect(
        service.createLocalUser('test@example.com', 'password'),
      ).rejects.toThrow('Unique constraint failed');
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getById('user-123');
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.getById('unknown-id');
      expect(result).toBeNull();
    });
  });

  // ── updateProfile ───────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates and returns the user', async () => {
      const updated = { ...mockUser, name: 'New Name' };
      mockPrisma.user.update.mockResolvedValue(updated);
      const result = await service.updateProfile('user-123', { name: 'New Name' });
      expect(result).toEqual(updated);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'New Name' },
      });
    });
  });

  // ── updatePassword ──────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('stores the hashed password', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      await service.updatePassword('user-123', '$2b$10$newhash');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: '$2b$10$newhash' },
      });
    });
  });

  // ── getLinkedProviders ──────────────────────────────────────────────────────

  describe('getLinkedProviders', () => {
    it('returns all linked providers for a user', async () => {
      const links = [{ id: 'lp-1', userId: 'user-123', provider: 'google', providerId: 'g-001', linkedAt: new Date() }];
      mockPrisma.linkedProvider.findMany.mockResolvedValue(links);
      const result = await service.getLinkedProviders('user-123');
      expect(result).toEqual(links);
      expect(mockPrisma.linkedProvider.findMany).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
    });
  });

  // ── linkProvider ────────────────────────────────────────────────────────────

  describe('linkProvider', () => {
    it('creates a LinkedProvider entry', async () => {
      const link = { id: 'lp-1', userId: 'user-123', provider: 'google', providerId: 'g-001', linkedAt: new Date() };
      mockPrisma.linkedProvider.create.mockResolvedValue(link);
      const result = await service.linkProvider('user-123', 'google', 'g-001');
      expect(result).toEqual(link);
      expect(mockPrisma.linkedProvider.create).toHaveBeenCalledWith({
        data: { userId: 'user-123', provider: 'google', providerId: 'g-001' },
      });
    });
  });

  // ── unlinkProvider ──────────────────────────────────────────────────────────

  describe('unlinkProvider', () => {
    it('deletes the LinkedProvider entry by userId + provider', async () => {
      mockPrisma.linkedProvider.delete.mockResolvedValue({});
      await service.unlinkProvider('user-123', 'google');
      expect(mockPrisma.linkedProvider.delete).toHaveBeenCalledWith({
        where: { userId_provider: { userId: 'user-123', provider: 'google' } },
      });
    });
  });

  // ── deleteUser ──────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('deletes the user by id', async () => {
      mockPrisma.user.delete.mockResolvedValue({});
      await service.deleteUser('user-123');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-123' } });
    });
  });

  // ── validateLocalUser ───────────────────────────────────────────────────────

  describe('validateLocalUser', () => {
    it('returns user when password matches', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, password: hashed });

      const result = await service.validateLocalUser('test@example.com', 'correct');
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('returns null when password does not match', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, password: hashed });

      const result = await service.validateLocalUser('test@example.com', 'wrong');
      expect(result).toBeNull();
    });

    it('returns null when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateLocalUser('unknown@example.com', 'password');
      expect(result).toBeNull();
    });

    it('returns null when user has no password set (OAuth user)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, password: null });
      const result = await service.validateLocalUser('oauth@example.com', 'password');
      expect(result).toBeNull();
    });
  });
});

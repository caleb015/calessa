import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../users/users.service';

describe('JwtStrategy', () => {
  const config = { getOrThrow: () => 'test-secret' } as unknown as ConfigService;
  const getById = jest.fn();
  const strategy = new JwtStrategy(config, { getById } as unknown as UsersService);

  it('accepts a token for an existing user', async () => {
    getById.mockResolvedValue({ id: 'u1' });
    await expect(strategy.validate({ sub: 'u1', email: 'a@example.com' })).resolves.toMatchObject({ userId: 'u1', email: 'a@example.com' });
  });

  it('rejects a token whose user has been deleted', async () => {
    getById.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'gone' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

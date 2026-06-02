import { BadRequestException, Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async validateUser(email: string, password?: string): Promise<any> {
    if (password) {
      const user = await this.usersService.validateLocalUser(email, password);
      if (!user) return null;
      const { password: _, ...result } = user as any;
      return result;
    }

    const user = await this.usersService.getByEmail(email);
    if (!user) return null;
    return { id: user.id, email: user.email };
  }

  private issueToken(user: User): { access_token: string } {
    const payload = { email: user.email, name: user.name, hasPassword: !!user.password };
    return { access_token: this.jwtService.sign(payload, { subject: user.id }) };
  }

  async login(user: { id?: string; email: string; provider: string; providerId?: string }): Promise<any> {
    // Local login path — user object already resolved by LocalStrategy
    if (user.id) {
      const fullUser = await this.usersService.getByEmail(user.email);
      if (!fullUser) return null;
      return { ...this.issueToken(fullUser), user: { id: fullUser.id, email: fullUser.email, name: fullUser.name, hasPassword: !!fullUser.password } };
    }

    // OAuth path — find or create user
    const byProvider = await this.usersService.getByProvider(user.provider, user.providerId || '');
    if (!byProvider) {
      const byEmail = await this.usersService.getByEmail(user.email);
      if (byEmail) {
        throw new ConflictException(
          'An account with this email already exists. Please sign in using the method you originally used.',
        );
      }
    }
    const savedUser = byProvider ?? await this.usersService.create({
      email: user.email,
      provider: user.provider,
      providerId: user.providerId || '',
    });

    return { ...this.issueToken(savedUser), user: { id: savedUser.id, email: savedUser.email, name: savedUser.name, hasPassword: !!savedUser.password } };
  }

  async register(email: string, password: string) {
    try {
      return await this.usersService.createLocalUser(email, password);
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('An account with this email already exists.');
      throw err;
    }
  }

  async updateProfile(userId: string, name: string | undefined): Promise<User> {
    return this.usersService.updateProfile(userId, { name });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.getById(userId);
    if (!user?.password) {
      throw new BadRequestException('No password set on this account.');
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect.');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashed);
  }
}

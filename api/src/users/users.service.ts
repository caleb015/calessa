import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedProvider, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async getByProvider(provider: string, providerId: string): Promise<User | null> {
    const link = await this.prisma.linkedProvider.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });
    return link?.user ?? null;
  }

  async create(data: { email: string; provider: string; providerId: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        linkedProviders: {
          create: { provider: data.provider, providerId: data.providerId },
        },
      },
    });
  }

  async createLocalUser(email: string, plainPassword: string): Promise<User> {
    const hashed = await bcrypt.hash(plainPassword, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashed,
        linkedProviders: {
          create: { provider: 'local', providerId: email },
        },
      },
    });
  }

  async validateLocalUser(email: string, plainPassword: string): Promise<User | null> {
    const user = await this.getByEmail(email);
    if (!user || !user.password) return null;
    const valid = await bcrypt.compare(plainPassword, user.password);
    if (!valid) return null;
    return user;
  }

  async updateProfile(id: string, data: { name?: string }): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { password: hashedPassword } });
  }

  async getLinkedProviders(userId: string): Promise<LinkedProvider[]> {
    return this.prisma.linkedProvider.findMany({ where: { userId } });
  }

  async linkProvider(userId: string, provider: string, providerId: string): Promise<LinkedProvider> {
    return this.prisma.linkedProvider.create({ data: { userId, provider, providerId } });
  }

  async unlinkProvider(userId: string, provider: string): Promise<void> {
    await this.prisma.linkedProvider.delete({
      where: { userId_provider: { userId, provider } },
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}

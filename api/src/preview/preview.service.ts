import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const PREVIEW_HEADER = 'x-preview-token';

/**
 * Short-lived tokens that let a logged-in admin view the public site while it is not public.
 * Signed with a secret distinct from login tokens, so neither can be used as the other.
 */
@Injectable()
export class PreviewService {
  constructor(private readonly jwt: JwtService) {}

  issue(userId: string) {
    return { token: this.jwt.sign({ sub: userId, scope: 'preview' }) };
  }

  async isValid(token: unknown): Promise<boolean> {
    if (typeof token !== 'string' || !token) return false;
    try {
      const payload = await this.jwt.verifyAsync(token);
      return payload?.scope === 'preview';
    } catch {
      return false;
    }
  }
}

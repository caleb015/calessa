import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class XStrategy extends PassportStrategy(Strategy, 'x') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      authorizationURL: config.getOrThrow('X_AUTH_URL'),
      tokenURL: config.getOrThrow('X_TOKEN_URL'),
      clientID: config.getOrThrow('X_API_KEY'),
      clientSecret: config.getOrThrow('X_API_SECRET'),
      callbackURL: config.getOrThrow('X_CALLBACK_URL'),
      scope: ['tweet.read', 'users.read'],
    });
    this.userInfoURL = config.getOrThrow('X_USERINFO_URL');
  }

  private userInfoURL: string;

  async validate(accessToken: string): Promise<any> {
    try {
      const res = await fetch(this.userInfoURL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await res.json() as any;
      const email = profile.email ?? profile.sub;
      const providerId = profile.sub ?? email;
      return await this.authService.login({ email, provider: 'x', providerId });
    } catch (err: any) {
      return { __error: err.message };
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      authorizationURL: config.getOrThrow('GOOGLE_AUTH_URL'),
      tokenURL: config.getOrThrow('GOOGLE_TOKEN_URL'),
      clientID: config.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow('GOOGLE_CALLBACK_URL'),
      scope: ['openid', 'email', 'profile'],
    });
    this.userInfoURL = config.getOrThrow('GOOGLE_USERINFO_URL');
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
      return await this.authService.login({ email, provider: 'google', providerId });
    } catch (err: any) {
      return { __error: err.message };
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      authorizationURL: config.getOrThrow('FACEBOOK_AUTH_URL'),
      tokenURL: config.getOrThrow('FACEBOOK_TOKEN_URL'),
      clientID: config.getOrThrow('FACEBOOK_APP_ID'),
      clientSecret: config.getOrThrow('FACEBOOK_APP_SECRET'),
      callbackURL: config.getOrThrow('FACEBOOK_CALLBACK_URL'),
      scope: ['email'],
    });
    this.userInfoURL = config.getOrThrow('FACEBOOK_USERINFO_URL');
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
      return await this.authService.login({ email, provider: 'facebook', providerId });
    } catch (err: any) {
      return { __error: err.message };
    }
  }
}

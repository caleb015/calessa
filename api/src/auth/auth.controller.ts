import {
  Controller, Get, Req, Res, UseGuards, Post, Patch, Delete,
  Body, Param, UnauthorizedException, HttpCode, HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

type AuthedRequest = Request & { user: { userId: string; email: string; name: string | null; hasPassword: boolean } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // ── OAuth login ────────────────────────────────────────────────────────────

  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('callback/google')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  @Get('oauth/facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookLogin() {}

  @Get('callback/facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  @Get('oauth/x')
  @UseGuards(AuthGuard('x'))
  xLogin() {}

  @Get('callback/x')
  @UseGuards(AuthGuard('x'))
  xCallback(@Req() req: Request, @Res() res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  private handleOAuthCallback(req: Request, res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const user = req.user as any;
    if (user.__error) {
      return res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(user.__error)}`);
    }
    return res.redirect(`${frontendUrl}/auth/callback?token=${user.access_token}`);
  }

  // ── OAuth provider linking ─────────────────────────────────────────────────

  @Get('link/:provider')
  @UseGuards(JwtAuthGuard)
  linkProvider(@Req() req: AuthedRequest, @Param('provider') provider: string) {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const state = this.jwtService.sign(
      { userId: req.user.userId, purpose: 'link' },
      { secret: jwtSecret, expiresIn: '10m' },
    );
    const authUrl = this.buildProviderAuthUrl(provider, state);
    if (!authUrl) throw new BadRequestException(`Unknown provider: ${provider}`);
    return { url: authUrl };
  }

  @Get('link/callback/:provider')
  async linkCallback(@Req() req: Request, @Res() res: Response, @Param('provider') provider: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const { code, state } = req.query as { code?: string; state?: string };

    if (!state || !code) {
      return res.redirect(`${frontendUrl}/dashboard/profile?error=invalid_request`);
    }

    let userId: string;
    try {
      const decoded = this.jwtService.verify(state, { secret: jwtSecret }) as any;
      if (decoded.purpose !== 'link') throw new Error('wrong purpose');
      userId = decoded.userId;
    } catch {
      return res.redirect(`${frontendUrl}/dashboard/profile?error=invalid_state`);
    }

    try {
      // Exchange code for token and get user profile via the strategy's userinfo endpoint
      const { providerId } = await this.exchangeCodeForProfile(provider, code);

      // Check if this provider+id is already linked to a different account
      const existing = await this.usersService.getByProvider(provider, providerId);
      if (existing && existing.id !== userId) {
        return res.redirect(`${frontendUrl}/dashboard/profile?error=provider_taken`);
      }

      await this.usersService.linkProvider(userId, provider, providerId);
      return res.redirect(`${frontendUrl}/dashboard/profile?linked=${provider}`);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Unique constraint — already linked to this user
        return res.redirect(`${frontendUrl}/dashboard/profile?error=already_linked`);
      }
      return res.redirect(`${frontendUrl}/dashboard/profile?error=link_failed`);
    }
  }

  private buildProviderAuthUrl(provider: string, state: string): string | null {
    const base = this.configService.get(`${provider.toUpperCase()}_AUTH_URL`);
    const clientId = this.configService.get(
      provider === 'google' ? 'GOOGLE_CLIENT_ID' :
      provider === 'facebook' ? 'FACEBOOK_APP_ID' :
      'X_API_KEY',
    );
    const callbackUrl = this.configService.get(`${provider.toUpperCase()}_CALLBACK_URL`
      .replace('CALLBACK', 'LINK_CALLBACK'));
    if (!base || !clientId || !callbackUrl) return null;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'openid email profile',
      state,
    });
    return `${base}?${params.toString()}`;
  }

  private async exchangeCodeForProfile(provider: string, code: string): Promise<{ providerId: string; email: string }> {
    const tokenUrl = this.configService.get(`${provider.toUpperCase()}_TOKEN_URL`);
    const userinfoUrl = this.configService.get(`${provider.toUpperCase()}_USERINFO_URL`);
    const clientId = this.configService.get(
      provider === 'google' ? 'GOOGLE_CLIENT_ID' :
      provider === 'facebook' ? 'FACEBOOK_APP_ID' :
      'X_API_KEY',
    );
    const clientSecret = this.configService.get(
      provider === 'google' ? 'GOOGLE_CLIENT_SECRET' :
      provider === 'facebook' ? 'FACEBOOK_APP_SECRET' :
      'X_API_SECRET',
    );
    const callbackUrl = this.configService.get(
      `${provider.toUpperCase()}_LINK_CALLBACK_URL`,
    );

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
      }).toString(),
    });
    const tokenData = await tokenRes.json() as any;
    const accessToken = tokenData.access_token;

    const profileRes = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json() as any;
    return {
      providerId: profile.sub ?? profile.id ?? profile.email,
      email: profile.email ?? profile.sub,
    };
  }

  // ── Local auth ─────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthedRequest) {
    const user = await this.usersService.getById(req.user.userId);
    if (!user) throw new UnauthorizedException();
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      hasPassword: !!user.password,
      createdAt: user.createdAt,
    };
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const user = await this.authService.register(body.email, body.password);
    const { password: _, ...result } = user as any;
    return result;
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user as any);
  }

  // ── Profile management ─────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Req() req: AuthedRequest, @Body() body: UpdateProfileDto) {
    const updated = await this.authService.updateProfile(req.user.userId, body.name);
    const { password: _, ...result } = updated as any;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  async changePassword(@Req() req: AuthedRequest, @Body() body: ChangePasswordDto) {
    await this.authService.changePassword(req.user.userId, body.currentPassword, body.newPassword);
    return { message: 'Password updated' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('providers')
  async getProviders(@Req() req: AuthedRequest) {
    const links = await this.usersService.getLinkedProviders(req.user.userId);
    return links
      .filter(l => l.provider !== 'local')
      .map(({ provider, linkedAt }) => ({ provider, linkedAt }));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('providers/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkProvider(@Req() req: AuthedRequest, @Param('provider') provider: string) {
    const links = await this.usersService.getLinkedProviders(req.user.userId);
    const isLinked = links.some(l => l.provider === provider);
    if (!isLinked) {
      throw new BadRequestException(`Provider ${provider} is not linked to your account.`);
    }
    const user = await this.usersService.getByEmail(req.user.email);
    const remainingLinks = links.filter(l => l.provider !== provider && l.provider !== 'local');
    const wouldHaveNoMethod = remainingLinks.length === 0 && !user?.password;
    if (wouldHaveNoMethod) {
      throw new BadRequestException('Cannot remove your only login method.');
    }
    await this.usersService.unlinkProvider(req.user.userId, provider);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Req() req: AuthedRequest) {
    await this.usersService.deleteUser(req.user.userId);
  }
}

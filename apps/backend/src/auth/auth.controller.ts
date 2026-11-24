import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Role } from '@last-lesson/shared-types';
import { accessCodeSchema, changePasswordSchema, forgotPasswordSchema, googleLinkSchema, googleSchema, loginSchema, preferencesSchema, registerCenterSchema, registerSchema, resetPasswordSchema, type AccessCodeInput, type GoogleInput, type LoginInput, type RegisterCenterInput, type RegisterInput } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { ClientIp, CurrentUser } from '../common/decorators';
import { ApiException } from '../common/errors';
import { RateLimit, RateLimitGuard, RateLimitService } from '../common/rate-limit';
import { zodPipe } from '../common/zod-validation.pipe';
import { webOrigins } from '../config';
import type { Actor } from '../common/actor';
import { AuthService, type Session } from './auth.service';

const COOKIE = 'll_rt';
const EVERYONE = Object.values(Role);

@ApiTags('auth')
@UseGuards(RateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly limits: RateLimitService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'E-mail sign in' })
  async login(@Body(zodPipe(loginSchema)) body: LoginInput, @ClientIp() ip: string, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.limits.guardFailures('login', ip, 15, 300, () => this.auth.login(body.email, body.password, ip)));
  }

  @Post('code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Student sign in with an access code. Group codes ask for a name first.' })
  async code(@Body(zodPipe(accessCodeSchema)) body: AccessCodeInput, @ClientIp() ip: string, @Res({ passthrough: true }) res: Response) {
    const outcome = await this.limits.guardFailures('code', ip, 25, 600, () => this.auth.enterCode(body, ip));
    if (!outcome.session) return outcome;
    return { ...this.send(res, outcome.session), personalCode: outcome.personalCode, needsProfile: false };
  }

  @Post('register')
  @RateLimit('register', 60, 3600)
  @ApiOperation({ summary: 'Student account with e-mail. Needs a code from the center; always creates or completes a student.' })
  async register(@Body(zodPipe(registerSchema)) body: RegisterInput, @ClientIp() ip: string, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.limits.guardFailures('code', ip, 25, 600, () => this.auth.register(body, ip)));
  }

  @Get('options')
  @ApiOperation({ summary: 'What the sign-in pages may offer' })
  options() {
    return this.auth.options();
  }

  @Post('register-center')
  @RateLimit('register-center', 6, 3600)
  @ApiOperation({ summary: 'An education center signs up by itself and starts on the trial plan' })
  async registerCenter(@Body(zodPipe(registerCenterSchema)) body: RegisterCenterInput, @ClientIp() ip: string, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.registerCenter(body, ip));
  }

  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with a Google ID token. A new account also needs a center code or a center name.' })
  async google(@Body(zodPipe(googleSchema)) body: GoogleInput, @ClientIp() ip: string, @Res({ passthrough: true }) res: Response) {
    const outcome = await this.limits.guardFailures('google', ip, 25, 600, () => this.auth.signInWithGoogle(body, ip));
    return 'needsProfile' in outcome ? outcome : { ...this.send(res, outcome), needsProfile: false };
  }

  @Post('google/link')
  @HttpCode(200)
  @RateLimit('google-link', 10, 900)
  @Auth(...EVERYONE)
  linkGoogle(@Body(zodPipe(googleLinkSchema)) body: { credential: string; password: string }, @CurrentUser() user: Actor, @ClientIp() ip: string) {
    return this.auth.linkGoogle(user.id, body.credential, body.password, ip);
  }

  @Delete('google/link')
  @Auth(...EVERYONE)
  unlinkGoogle(@CurrentUser() user: Actor, @ClientIp() ip: string) {
    return this.auth.unlinkGoogle(user.id, ip);
  }

  @Patch('me')
  @Auth(...EVERYONE)
  preferences(@Body(zodPipe(preferencesSchema)) body: { locale: string }, @CurrentUser() user: Actor) {
    return this.auth.setPreferences(user.id, body);
  }

  @Post('refresh')
  @HttpCode(200)
  @RateLimit('refresh', 900, 300)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertSameSite(req);
    try {
      return this.send(res, await this.auth.refresh(req.cookies?.[COOKIE]));
    } catch (error) {
      this.clear(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertSameSite(req);
    await this.auth.logout(req.cookies?.[COOKIE]);
    this.clear(res);
    return { ok: true };
  }

  @Get('me')
  @Auth(...EVERYONE)
  me(@CurrentUser() user: Actor) {
    return this.auth.me(user);
  }

  @Post('change-password')
  @HttpCode(200)
  @RateLimit('change-password', 8, 900)
  @Auth(...EVERYONE)
  async changePassword(@Body(zodPipe(changePasswordSchema)) body: { currentPassword: string; newPassword: string }, @CurrentUser() user: Actor, @ClientIp() ip: string, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.changePassword(user, body.currentPassword, body.newPassword, ip));
  }

  @Post('forgot-password')
  @HttpCode(200)
  @RateLimit('forgot', 5, 3600)
  forgotPassword(@Body(zodPipe(forgotPasswordSchema)) body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @RateLimit('reset', 10, 3600)
  async resetPassword(@Body(zodPipe(resetPasswordSchema)) body: { token: string; password: string }) {
    await this.auth.resetPassword(body.token, body.password);
    return { message: 'Password updated' };
  }

  /** The refresh token is only ever an httpOnly cookie; scripts can never read it. */
  private send(res: Response, session: Session) {
    const production = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE, session.refreshToken, { httpOnly: true, secure: production, sameSite: 'lax', path: '/api/v1/auth', maxAge: session.refreshTtl * 1000 });
    return { accessToken: session.accessToken, expiresIn: session.expiresIn };
  }

  private clear(res: Response) {
    res.clearCookie(COOKIE, { path: '/api/v1/auth' });
  }

  /** CSRF protection for the cookie endpoints: a custom header forces a CORS preflight, and the origin must be known. */
  private assertSameSite(req: Request) {
    const origin = req.headers.origin;
    const sameHost = !origin || (URL.canParse(origin) && new URL(origin).host === req.headers.host);
    if (!req.headers['x-ll-client'] || (origin && !sameHost && !webOrigins().includes(origin))) throw new ApiException('CSRF', 'Request blocked', 403);
  }
}

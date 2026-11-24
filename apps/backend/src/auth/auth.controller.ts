import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '@last-lesson/validation';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Public registration. Role is always GAMER.' })
  register(@Body(zodPipe(registerSchema)) body: any) {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(zodPipe(loginSchema)) body: any) {
    return this.auth.login(body.email, body.password);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(zodPipe(refreshSchema)) body: any) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.auth.logout(req.body?.refreshToken).then(() => ({ message: 'Logged out' }));
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return this.auth.me(user.id);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body(zodPipe(forgotPasswordSchema)) body: any) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body(zodPipe(resetPasswordSchema)) body: any) {
    return this.auth.resetPassword(body.token, body.password).then(() => ({ message: 'Password updated' }));
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('google')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  google(@Body() dto: GoogleAuthDto) {
    return this.auth.googleSignIn(dto.idToken, dto.accessToken);
  }

  @Post('apple')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  apple(@Body() dto: AppleAuthDto) {
    return this.auth.appleSignIn(dto);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser('sub') userId: string) {
    return this.auth.logout(userId);
  }
}

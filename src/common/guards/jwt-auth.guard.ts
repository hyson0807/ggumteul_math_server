import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly accessSecret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.accessSecret,
      });
      (request as unknown as Record<string, unknown>)['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }
}

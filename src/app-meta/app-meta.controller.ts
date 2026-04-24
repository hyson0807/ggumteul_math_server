import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { VersionCheckQueryDto } from './dto/version-check-query.dto';

@Controller('app')
export class AppMetaController {
  constructor(private readonly config: ConfigService) {}

  @Get('version-check')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  versionCheck(@Query() query: VersionCheckQueryDto) {
    return {
      platform: query.platform,
      minimumVersion: this.config.get<string>('APP_MINIMUM_VERSION') ?? '1.0.0',
      storeUrl: {
        ios: this.config.get<string>('APP_STORE_URL_IOS') ?? '',
        android: this.config.get<string>('APP_STORE_URL_ANDROID') ?? '',
      },
    };
  }
}

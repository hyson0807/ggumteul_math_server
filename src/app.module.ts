import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WormModule } from './worm/worm.module';
import { RoomModule } from './room/room.module';
import { ShopModule } from './shop/shop.module';
import { LearningModule } from './learning/learning.module';
import { AppMetaModule } from './app-meta/app-meta.module';
import { PrismaRetryInterceptor } from './common/interceptors/prisma-retry.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static',
      // 가구/벽지/문제 이미지는 같은 이름의 파일을 덮어쓰지 않고 새 이름으로 추가하는
      // 정책이라 immutable 안전. 기존 파일명 그대로 내용만 바꿔치우면 클라이언트가
      // 최대 1년간 갱신을 안 받으니, 교체 시 파일명도 함께 변경할 것.
      serveStaticOptions: {
        maxAge: '365d',
        immutable: true,
      },
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    WormModule,
    RoomModule,
    ShopModule,
    LearningModule,
    AppMetaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: PrismaRetryInterceptor },
  ],
})
export class AppModule {}

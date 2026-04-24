import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  const corsOrigin = process.env.CORS_ORIGIN?.split(',');
  app.enableCors({
    origin: corsOrigin ?? (process.env.NODE_ENV === 'production' ? [] : true),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();

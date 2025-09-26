import 'module-alias/register';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Allow your React app to make requests
  app.enableCors({
    origin: 'http://localhost:3000', // React dev server
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

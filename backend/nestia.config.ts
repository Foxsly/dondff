import { INestiaConfig } from '@nestia/sdk';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';

const NESTIA_CONFIG: INestiaConfig = {
  input: async () => {
    return await NestFactory.create(AppModule);
  },
  output: 'src/infrastructure/test/sdk',
  e2e: 'test',
};
export default NESTIA_CONFIG;

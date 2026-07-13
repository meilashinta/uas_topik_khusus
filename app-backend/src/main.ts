import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formatError = (errors: any[]) => {
          return errors.map(err => {
            return {
              field: err.property,
              errors: Object.values(err.constraints || {}),
            };
          });
        };
        return new BadRequestException(formatError(errors));
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

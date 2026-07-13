import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';

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

  const config = new DocumentBuilder()
    .setTitle('HelpDeskPro API')
    .setDescription('Platform Helpdesk Internal Berbasis RBAC dan SLA Management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Users')
    .addTag('Departments')
    .addTag('Categories')
    .addTag('Priorities')
    .addTag('Tickets')
    .addTag('Assignments')
    .addTag('Comments')
    .addTag('Attachments')
    .addTag('Notifications')
    .addTag('Dashboard')
    .addTag('Reports')
    .addTag('Ratings')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

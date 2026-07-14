import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
  // Create a standalone application context
  const app = await NestFactory.createApplicationContext(AppModule);

  // The application context initializes all providers and their onModuleInit methods,
  // which includes the AnalyticsWorkerService subscribing to RabbitMQ.
  console.log('Analytics Worker started successfully.');
}
bootstrap();

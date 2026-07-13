import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { EventPublisher } from './event-publisher';

@Global()
@Module({
  providers: [RabbitMQService, EventPublisher],
  exports: [RabbitMQService, EventPublisher],
})
export class RabbitMQModule {}

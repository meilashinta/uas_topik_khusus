import { Injectable } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { randomUUID } from 'crypto';
import { TicketEvent } from './event.interfaces';

@Injectable()
export class EventPublisher {
  constructor(private readonly rabbitmqService: RabbitMQService) {}

  async publishTicketEvent(routingKey: string, payload: Omit<TicketEvent, 'eventId' | 'timestamp'>): Promise<void> {
    const event: TicketEvent = {
      ...payload,
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    await this.rabbitmqService.publish('ticket.events', routingKey, event);
  }

  // Generic publisher if needed
  async publishEvent(exchange: string, routingKey: string, payload: any): Promise<void> {
    const event = {
      ...payload,
      eventId: payload.eventId || randomUUID(),
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    await this.rabbitmqService.publish(exchange, routingKey, event);
  }
}

import { EventPublisher } from './event-publisher';
import { RabbitMQService } from './rabbitmq.service';

describe('EventPublisher', () => {
  let eventPublisher: EventPublisher;
  let rabbitMQServiceMock: jest.Mocked<Partial<RabbitMQService>>;

  beforeEach(() => {
    rabbitMQServiceMock = {
      publish: jest.fn(),
    };
    eventPublisher = new EventPublisher(rabbitMQServiceMock as any);
  });

  it('should auto-generate eventId and timestamp and publish to rabbitmq', async () => {
    const payload = {
      eventType: 'TICKET_CREATED',
      ticketId: '123',
      ticketNumber: 'TKT-001',
    };

    await eventPublisher.publishTicketEvent('ticket.created', payload);

    expect(rabbitMQServiceMock.publish).toHaveBeenCalled();
    const publishedCall = (rabbitMQServiceMock.publish as jest.Mock).mock.calls[0];
    expect(publishedCall?.[0]).toBe('ticket.events');
    expect(publishedCall?.[1]).toBe('ticket.created');
    
    const event = publishedCall?.[2] as any;
    expect(event.eventId).toBeDefined();
    expect(event.timestamp).toBeDefined();
    expect(event.eventType).toBe('TICKET_CREATED');
    expect(event.ticketId).toBe('123');
  });
});

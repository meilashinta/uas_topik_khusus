import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ChannelModel, Channel, connect, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection!: ChannelModel;
  private channel!: Channel;

  async onModuleInit() {
    await this.connect();
    await this.setupTopology();
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  private async connect() {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    try {
      this.connection = await connect(url);
      this.channel = await this.connection.createChannel();
      this.logger.log('Connected to RabbitMQ');

      this.connection.on('error', (err: any) => {
        this.logger.error('RabbitMQ connection error', err);
      });
      
      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        // Implement retry logic in real scenario
      });
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ', err);
    }
  }

  private async setupTopology() {
    if (!this.channel) return;

    // Exchanges
    await this.channel.assertExchange('ticket.events', 'topic', { durable: true });
    await this.channel.assertExchange('sla.events', 'topic', { durable: true });
    
    // DLQ Exchange
    await this.channel.assertExchange('dlx', 'direct', { durable: true });
    await this.channel.assertQueue('dlq', { durable: true });
    await this.channel.bindQueue('dlq', 'dlx', 'failed');

    // Queues
    const queueOptions = {
      durable: true,
      deadLetterExchange: 'dlx',
      deadLetterRoutingKey: 'failed',
    };

    await this.channel.assertQueue('notification-worker', queueOptions);
    await this.channel.assertQueue('activity-worker', queueOptions);
    await this.channel.assertQueue('analytics-worker', queueOptions);

    // Bindings (Example based on typical PRD)
    await this.channel.bindQueue('notification-worker', 'ticket.events', 'ticket.#');
    await this.channel.bindQueue('notification-worker', 'sla.events', 'sla.#');
    await this.channel.bindQueue('activity-worker', 'ticket.events', 'ticket.#');
    await this.channel.bindQueue('analytics-worker', 'ticket.events', 'ticket.resolved');
    await this.channel.bindQueue('analytics-worker', 'ticket.events', 'ticket.closed');
    
    this.logger.log('RabbitMQ Topology setup complete');
  }

  async publish(exchange: string, routingKey: string, payload: object): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    const message = Buffer.from(JSON.stringify(payload));
    this.channel.publish(exchange, routingKey, message, { persistent: true });
  }

  async subscribe(queue: string, handler: (msg: ConsumeMessage | null) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          await handler(msg);
          this.channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing message from queue ${queue}`, error);
          // In real scenario, track retries (x-death) and reject if > 3
          // For now, simple reject with requeue=false sends it to DLQ
          this.channel.reject(msg, false);
        }
      }
    });
  }

  async ping(): Promise<boolean> {
    return this.connection && this.channel ? true : false;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class TicketNumberGenerator {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the latest ticket created today
    const latestTicket = await this.prisma.ticket.findFirst({
      where: {
        ticketNumber: {
          startsWith: `TKT-${datePrefix}-`,
        },
      },
      orderBy: {
        ticketNumber: 'desc',
      },
    });

    let nextCounter = 1;

    if (latestTicket) {
      // Extract the counter from the latest ticket number (e.g., TKT-20260710-0005 -> 5)
      const parts = latestTicket.ticketNumber.split('-');
      if (parts.length === 3) {
        const lastCounter = parseInt(parts[2], 10);
        if (!isNaN(lastCounter)) {
          nextCounter = lastCounter + 1;
        }
      }
    }

    const counterString = String(nextCounter).padStart(4, '0');
    return `TKT-${datePrefix}-${counterString}`;
  }
}

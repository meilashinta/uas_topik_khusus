import { TicketNumberGenerator } from './ticket-number.generator';

describe('TicketNumberGenerator', () => {
  let generator: TicketNumberGenerator;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      ticket: {
        findFirst: jest.fn(),
      },
    };
    generator = new TicketNumberGenerator(prismaMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate TKT-YYYYMMDD-0001 when there is no ticket today', async () => {
    prismaMock.ticket.findFirst.mockResolvedValue(null);

    const ticketNumber = await generator.generate();

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    expect(ticketNumber).toBe(`TKT-${dateStr}-0001`);
  });

  it('should generate the next number when tickets exist today', async () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    prismaMock.ticket.findFirst.mockResolvedValue({
      ticketNumber: `TKT-${dateStr}-0042`,
    });

    const ticketNumber = await generator.generate();

    expect(ticketNumber).toBe(`TKT-${dateStr}-0043`);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ExcelGeneratorService } from './excel-generator.service';

describe('ExcelGeneratorService', () => {
  let service: ExcelGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExcelGeneratorService],
    }).compile();

    service = module.get<ExcelGeneratorService>(ExcelGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate ticket report excel', async () => {
    const data = {
      period: 'Jan',
      generatedAt: 'Now',
      summary: { totalTickets: 1, slaComplianceRate: 100 },
      tickets: [
        { ticketNumber: '1', title: 'T', priority: 'H', status: 'O', createdAt: 'Today', technician: 'Me' }
      ]
    };
    
    const result = await service.generateTicketReportExcel(data);
    expect(result).toBeInstanceOf(Buffer);
  });

  it('should generate technician report excel', async () => {
    const data = {
      period: 'Jan',
      generatedAt: 'Now',
      technicians: [
        { name: 'Me', totalTickets: 1, resolved: 1, avgResolutionTime: 10, avgRating: 5, slaComplianceRate: 100.00 }
      ]
    };
    
    const result = await service.generateTechnicianReportExcel(data);
    expect(result).toBeInstanceOf(Buffer);
  });
});

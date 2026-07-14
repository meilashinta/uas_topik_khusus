import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { BadRequestException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prismaService: any;
  let pdfGenerator: any;
  let excelGenerator: any;

  beforeEach(async () => {
    prismaService = {
      ticket: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      }
    };
    
    pdfGenerator = {
      generateTicketReportPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      generateTechnicianReportPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    
    excelGenerator = {
      generateTicketReportExcel: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
      generateTechnicianReportExcel: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: PdfGeneratorService, useValue: pdfGenerator },
        { provide: ExcelGeneratorService, useValue: excelGenerator },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTicketReport', () => {
    it('should generate PDF when format is pdf', async () => {
      const filter = new ReportFilterDto();
      filter.format = 'pdf';
      filter.dateFrom = '2023-01-01';
      filter.dateTo = '2023-01-31';

      const result = await service.generateTicketReport(filter);
      expect(result).toBeInstanceOf(Buffer);
      expect(pdfGenerator.generateTicketReportPdf).toHaveBeenCalled();
    });

    it('should generate Excel when format is xlsx', async () => {
      const filter = new ReportFilterDto();
      filter.format = 'xlsx';
      filter.dateFrom = '2023-01-01';
      filter.dateTo = '2023-01-31';

      const result = await service.generateTicketReport(filter);
      expect(result).toBeInstanceOf(Buffer);
      expect(excelGenerator.generateTicketReportExcel).toHaveBeenCalled();
    });

    it('should throw error for unsupported format', async () => {
      const filter = new ReportFilterDto();
      filter.format = 'doc';
      await expect(service.generateTicketReport(filter)).rejects.toThrow(BadRequestException);
    });

    it('should parse filters correctly and process data', async () => {
      const filter = new ReportFilterDto();
      filter.format = 'pdf';
      filter.departmentId = 'd1';
      filter.categoryId = 'c1';
      filter.priorityId = 'p1';
      filter.status = 'OPEN' as any;
      filter.technicianId = 't1';

      prismaService.ticket.findMany.mockResolvedValue([
        {
          isOverdue: false,
          ticketNumber: 'TKT-1',
          title: 'Test',
          priority: { name: 'High' },
          status: 'OPEN',
          createdAt: new Date(),
          assignments: [{ technician: { name: 'Tech 1' } }]
        }
      ]);

      await service.generateTicketReport(filter);
      
      expect(prismaService.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          category: { departmentId: 'd1' },
          categoryId: 'c1',
          priorityId: 'p1',
          status: 'OPEN',
        })
      }));
    });
  });

  describe('generateTechnicianPerformanceReport', () => {
    it('should generate PDF', async () => {
      const filter = new ReportFilterDto();
      filter.format = 'pdf';
      prismaService.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          name: 'Tech 1'
        }
      ]);
      prismaService.ticket.findMany.mockResolvedValue([
        {
          status: 'RESOLVED',
          createdAt: new Date('2023-01-01T10:00:00Z'),
          resolvedAt: new Date('2023-01-01T11:00:00Z'), // 60 mins
          rating: { score: 5 },
          isOverdue: true
        },
        {
          status: 'CLOSED',
          createdAt: new Date('2023-01-01T10:00:00Z'),
          resolvedAt: new Date('2023-01-01T10:30:00Z'), // 30 mins
          isOverdue: false
        }
      ]);

      const result = await service.generateTechnicianPerformanceReport(filter);
      expect(result).toBeInstanceOf(Buffer);
      expect(pdfGenerator.generateTechnicianReportPdf).toHaveBeenCalled();
    });

    it('should generate Excel', async () => {
      const filter = new ReportFilterDto();
      filter.format = 'xlsx';
      prismaService.user.findMany.mockResolvedValue([]);

      const result = await service.generateTechnicianPerformanceReport(filter);
      expect(result).toBeInstanceOf(Buffer);
      expect(excelGenerator.generateTechnicianReportExcel).toHaveBeenCalled();
    });
  });
});

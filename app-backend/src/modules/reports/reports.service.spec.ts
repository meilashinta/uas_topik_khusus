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
  });
});

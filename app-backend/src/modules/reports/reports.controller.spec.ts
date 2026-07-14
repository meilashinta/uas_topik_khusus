import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { RoleName } from '@prisma/client';
import { ReportFilterDto } from './dto/report-filter.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: any;

  beforeEach(async () => {
    reportsService = {
      generateTicketReport: jest.fn().mockResolvedValue(Buffer.from('test')),
      generateTechnicianPerformanceReport: jest.fn().mockResolvedValue(Buffer.from('test')),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: reportsService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateTicketReport', () => {
    it('should inject departmentId for SUPERVISOR', async () => {
      const req = { user: { role: RoleName.SUPERVISOR, departmentId: 'dep-1' } };
      const res = { set: jest.fn(), send: jest.fn() } as any;
      const filter = new ReportFilterDto();
      filter.format = 'pdf';
      
      await controller.generateTicketReport(req, filter, res);
      expect(reportsService.generateTicketReport).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: 'dep-1' })
      );
      expect(res.set).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });
  });
});

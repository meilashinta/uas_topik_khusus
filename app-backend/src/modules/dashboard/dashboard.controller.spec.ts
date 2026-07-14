import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { StatisticsService } from './statistics.service';
import { RoleName } from '@prisma/client';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

describe('DashboardController', () => {
  let controller: DashboardController;
  let statisticsService: any;

  beforeEach(async () => {
    statisticsService = {
      getDashboardSummary: jest.fn().mockResolvedValue({ totalTickets: 10 }),
      getSlaCompliance: jest.fn().mockResolvedValue({ overallComplianceRate: 100 }),
      getTechnicianPerformance: jest.fn().mockResolvedValue({ technicians: [] }),
      getTicketTrend: jest.fn().mockResolvedValue({ period: 'month', data: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: StatisticsService, useValue: statisticsService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('should call service with injected technicianId for TECHNICIAN role', async () => {
      const req = { user: { role: RoleName.TECHNICIAN, userId: 'tech-1' } };
      await controller.getSummary(req, new DashboardFilterDto());
      expect(statisticsService.getDashboardSummary).toHaveBeenCalledWith(
        expect.objectContaining({ technicianId: 'tech-1' })
      );
    });

    it('should call service with injected departmentId for SUPERVISOR role', async () => {
      const req = { user: { role: RoleName.SUPERVISOR, departmentId: 'dep-1' } };
      await controller.getSummary(req, new DashboardFilterDto());
      expect(statisticsService.getDashboardSummary).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: 'dep-1' })
      );
    });

    it('should call service without injecting ids for ADMINISTRATOR role', async () => {
      const req = { user: { role: RoleName.ADMINISTRATOR } };
      const filter = new DashboardFilterDto();
      await controller.getSummary(req, filter);
      expect(statisticsService.getDashboardSummary).toHaveBeenCalledWith(filter);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BadRequestException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaMock: any;
  let auditLogMock: any;

  beforeEach(async () => {
    prismaMock = {
      department: {
        findUnique: jest.fn(),
      },
      ticketCategory: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    auditLogMock = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw error if department is inactive or not found', async () => {
      prismaMock.department.findUnique.mockResolvedValue({ id: 'dept1', isActive: false });
      
      await expect(service.create({ name: 'Cat', description: 'Desc', departmentId: 'dept1' }, 'admin1', {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should create successfully if department is valid', async () => {
      prismaMock.department.findUnique.mockResolvedValue({ id: 'dept1', isActive: true });
      prismaMock.ticketCategory.create.mockResolvedValue({ id: 'cat1', name: 'Cat' });
      
      const result = await service.create({ name: 'Cat', description: 'Desc', departmentId: 'dept1' }, 'admin1', {});
      
      expect(result.id).toBe('cat1');
      expect(auditLogMock.logAction).toHaveBeenCalledWith(
        'CATEGORY_CREATED', 'TicketCategory', 'cat1', 'admin1', expect.any(Object), expect.any(Object)
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete category and not hard delete', async () => {
      prismaMock.ticketCategory.findUnique.mockResolvedValue({ id: 'cat1', isActive: true, _count: { tickets: 0 } });
      prismaMock.ticketCategory.update.mockResolvedValue({ id: 'cat1', isActive: false });
      
      await service.softDelete('cat1', 'admin1', {});
      
      expect(prismaMock.ticketCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat1' },
        data: { isActive: false },
      });
      expect(auditLogMock.logAction).toHaveBeenCalledWith(
        'CATEGORY_DEACTIVATED', 'TicketCategory', 'cat1', 'admin1', expect.any(Object), expect.any(Object)
      );
    });
  });
});

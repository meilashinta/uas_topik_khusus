import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ConflictException } from '@nestjs/common';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let prismaMock: any;
  let auditLogMock: any;

  beforeEach(async () => {
    prismaMock = {
      department: {
        findFirst: jest.fn(),
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
        DepartmentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject creation if code is not unique (case-insensitive)', async () => {
      prismaMock.department.findFirst.mockResolvedValue({ id: '1', code: 'IT' });
      await expect(service.create({ name: 'Tech', code: 'it' }, 'admin1', {}))
        .rejects.toThrow(ConflictException);
    });

    it('should successfully create and convert code to uppercase', async () => {
      prismaMock.department.findFirst.mockResolvedValue(null);
      prismaMock.department.create.mockResolvedValue({ id: '1', code: 'IT', name: 'Information Technology' });
      
      const result = await service.create({ name: 'Information Technology', code: 'it' }, 'admin1', {});
      
      expect(result.code).toBe('IT');
      expect(prismaMock.department.create).toHaveBeenCalledWith({
        data: { name: 'Information Technology', code: 'IT' }
      });
      expect(auditLogMock.logAction).toHaveBeenCalledWith(
        'DEPARTMENT_CREATED', 'Department', '1', 'admin1', expect.any(Object), expect.any(Object)
      );
    });
  });

  describe('softDelete', () => {
    it('should only set isActive to false and not hard delete', async () => {
      prismaMock.department.findUnique.mockResolvedValue({ 
        id: '1', isActive: true, _count: { users: 0 } 
      });
      prismaMock.department.update.mockResolvedValue({ id: '1', isActive: false });

      await service.softDelete('1', 'admin1', {});

      expect(prismaMock.department.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
      expect(auditLogMock.logAction).toHaveBeenCalledWith(
        'DEPARTMENT_DEACTIVATED', 'Department', '1', 'admin1', expect.any(Object), expect.any(Object)
      );
    });
  });
});

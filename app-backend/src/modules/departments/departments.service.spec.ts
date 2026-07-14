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

  describe('findAll', () => {
    it('should return paginated departments', async () => {
      prismaMock.department.findMany = jest.fn().mockResolvedValue([{ id: 'd1' }]);
      prismaMock.department.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10, isActive: true, search: 'Tech' } as any);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      prismaMock.department.findUnique.mockResolvedValue(null);
      await expect(service.findOne('d1')).rejects.toThrow(require('@nestjs/common').NotFoundException);
    });

    it('should return department', async () => {
      prismaMock.department.findUnique.mockResolvedValue({ id: 'd1' });
      const result = await service.findOne('d1');
      expect(result.id).toBe('d1');
    });
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

  describe('update', () => {
    it('should throw error if department not found', async () => {
      prismaMock.department.findUnique.mockResolvedValue(null);
      await expect(service.update('d1', {}, 'admin1', {})).rejects.toThrow(require('@nestjs/common').NotFoundException);
    });

    it('should reject update if code is not unique', async () => {
      prismaMock.department.findUnique.mockResolvedValue({ id: 'd1', code: 'OLD' });
      prismaMock.department.findFirst.mockResolvedValue({ id: 'd2', code: 'NEW' });
      
      await expect(service.update('d1', { code: 'new' }, 'admin1', {}))
        .rejects.toThrow(ConflictException);
    });

    it('should update successfully', async () => {
      prismaMock.department.findUnique.mockResolvedValue({ id: 'd1', code: 'OLD' });
      prismaMock.department.findFirst.mockResolvedValue(null);
      prismaMock.department.update.mockResolvedValue({ id: 'd1', name: 'New' });
      
      const result = await service.update('d1', { name: 'New', code: 'new' }, 'admin1', {});
      
      expect(result.name).toBe('New');
      expect(auditLogMock.logAction).toHaveBeenCalled();
      expect(prismaMock.department.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { name: 'New', code: 'NEW' }
      });
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

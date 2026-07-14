import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      prismaMock.role.findMany.mockResolvedValue([{ id: 'r1' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);
      await expect(service.findOne('r1')).rejects.toThrow(NotFoundException);
    });

    it('should return role if found', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'r1' });
      const result = await service.findOne('r1');
      expect(result.id).toBe('r1');
    });
  });
});

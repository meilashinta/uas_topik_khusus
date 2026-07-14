import { Test, TestingModule } from '@nestjs/testing';
import { SlaService } from './sla.service';

describe('SlaService', () => {
  let service: SlaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlaService],
    }).compile();

    service = module.get<SlaService>(SlaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateSlaDueAt', () => {
    it('should add minutes to start time', () => {
      const startTime = new Date('2026-07-10T10:00:00Z');
      const slaMinutes = 60; // 1 hour
      const expected = new Date('2026-07-10T11:00:00Z');
      expect(service.calculateSlaDueAt(slaMinutes, startTime)).toEqual(expected);
    });
  });

  describe('getRemainingTime', () => {
    it('should calculate remaining minutes correctly', () => {
      // Mock Date.now or simply use relative times
      const due = new Date();
      due.setMinutes(due.getMinutes() + 30);
      
      const remaining = service.getRemainingTime(due);
      // Depending on execution speed, it could be 29 or 30
      expect(remaining).toBeGreaterThanOrEqual(29);
      expect(remaining).toBeLessThanOrEqual(30);
    });
    
    it('should return negative if overdue', () => {
      const due = new Date();
      due.setMinutes(due.getMinutes() - 15);
      
      const remaining = service.getRemainingTime(due);
      expect(remaining).toBeLessThan(0);
      expect(remaining).toBeGreaterThanOrEqual(-16);
      expect(remaining).toBeLessThanOrEqual(-15);
    });
  });

  describe('getRemainingPercentage', () => {
    it('should calculate percentage correctly', () => {
      const due = new Date();
      due.setMinutes(due.getMinutes() + 60);
      
      const total = 120; // total 2 hours
      const percentage = service.getRemainingPercentage(due, total);
      
      // Around 50%
      expect(percentage).toBeGreaterThanOrEqual(49);
      expect(percentage).toBeLessThanOrEqual(50);
    });
    
    it('should clamp to 0 if overdue', () => {
      const due = new Date();
      due.setMinutes(due.getMinutes() - 10);
      const total = 100;
      expect(service.getRemainingPercentage(due, total)).toBe(0);
    });
    
    it('should clamp to 100 if somehow more time is remaining', () => {
      const due = new Date();
      due.setMinutes(due.getMinutes() + 200);
      const total = 100;
      expect(service.getRemainingPercentage(due, total)).toBe(100);
    });
  });

  describe('isOverdue', () => {
    it('should return true if past due date', () => {
      const due = new Date(Date.now() - 1000); // 1 second ago
      expect(service.isOverdue(due)).toBe(true);
    });

    it('should return false if before due date', () => {
      const due = new Date(Date.now() + 60000); // 1 minute future
      expect(service.isOverdue(due)).toBe(false);
    });
  });

  describe('isWarning', () => {
    it('should return true if <= 20% remaining and not overdue', () => {
      const due = new Date();
      due.setMinutes(due.getMinutes() + 19); // 19 minutes left
      const total = 100; // 19%
      expect(service.isWarning(due, total)).toBe(true);
    });
    
    it('should return false if > 20% remaining', () => {
      const due = new Date();
      due.setMinutes(due.getMinutes() + 25); // 25 minutes left
      const total = 100; // 25%
      expect(service.isWarning(due, total)).toBe(false);
    });

    it('should return false if already overdue', () => {
      const due = new Date();
      due.setMinutes(due.getMinutes() - 5); // Overdue
      const total = 100;
      expect(service.isWarning(due, total)).toBe(false); // Overdue is handled separately
    });
  });
});

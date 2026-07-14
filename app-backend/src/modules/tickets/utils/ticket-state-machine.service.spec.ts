import { Test, TestingModule } from '@nestjs/testing';
import { TicketStateMachineService, VALID_TRANSITIONS } from './ticket-state-machine.service';
import { TicketStatus, RoleName } from '@prisma/client';
import { UnprocessableEntityException, ForbiddenException } from '@nestjs/common';

describe('TicketStateMachineService', () => {
  let service: TicketStateMachineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketStateMachineService],
    }).compile();

    service = module.get<TicketStateMachineService>(TicketStateMachineService);
  });

  describe('Transitions Matrix (36+ combinations)', () => {
    const allStatuses = Object.values(TicketStatus);

    for (const from of allStatuses) {
      for (const to of allStatuses) {
        it(`should test transition from ${from} to ${to}`, () => {
          const isValid = VALID_TRANSITIONS[from]?.includes(to) ?? false;
          
          if (isValid) {
            expect(service.canTransition(from, to)).toBe(true);
            expect(() => service.validateTransition(from, to)).not.toThrow();
          } else {
            expect(service.canTransition(from, to)).toBe(false);
            expect(() => service.validateTransition(from, to)).toThrow(UnprocessableEntityException);
          }
        });
      }
    }
  });

  describe('Role Validation', () => {
    const creatorUser = { userId: 'user1', role: RoleName.EMPLOYEE };
    const otherUser = { userId: 'user2', role: RoleName.EMPLOYEE };
    const technician = { userId: 'tech1', role: RoleName.TECHNICIAN };
    const otherTechnician = { userId: 'tech2', role: RoleName.TECHNICIAN };
    const supervisor = { userId: 'sup1', role: RoleName.SUPERVISOR };

    it('should allow supervisor to reject OPEN ticket', () => {
      expect(() => service.validateTransitionRole(TicketStatus.OPEN, TicketStatus.REJECTED, supervisor, {})).not.toThrow();
    });

    it('should NOT allow employee to reject OPEN ticket', () => {
      expect(() => service.validateTransitionRole(TicketStatus.OPEN, TicketStatus.REJECTED, creatorUser, {})).toThrow(ForbiddenException);
    });

    it('should allow assigned technician to progress ticket', () => {
      const ticket = { assignments: [{ technicianId: 'tech1', isActive: true }] };
      expect(() => service.validateTransitionRole(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, technician, ticket)).not.toThrow();
    });

    it('should NOT allow unassigned technician to progress ticket', () => {
      const ticket = { assignments: [{ technicianId: 'tech1', isActive: true }] };
      expect(() => service.validateTransitionRole(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, otherTechnician, ticket)).toThrow(ForbiddenException);
    });

    it('should allow creator to reopen RESOLVED ticket', () => {
      const ticket = { createdById: 'user1' };
      expect(() => service.validateTransitionRole(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS, creatorUser, ticket)).not.toThrow();
    });

    it('should NOT allow other employee to reopen RESOLVED ticket', () => {
      const ticket = { createdById: 'user1' };
      expect(() => service.validateTransitionRole(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS, otherUser, ticket)).toThrow(ForbiddenException);
    });

    it('should allow creator to cancel OPEN ticket', () => {
      const ticket = { createdById: 'user1' };
      expect(() => service.validateTransitionRole(TicketStatus.OPEN, TicketStatus.CANCELLED, creatorUser, ticket)).not.toThrow();
    });

    it('should NOT allow other user to cancel OPEN ticket', () => {
      const ticket = { createdById: 'user1' };
      expect(() => service.validateTransitionRole(TicketStatus.OPEN, TicketStatus.CANCELLED, otherUser, ticket)).toThrow(ForbiddenException);
    });

    it('should allow Technician to resolve ticket if assigned', () => {
      const ticket = { assignments: [{ technicianId: 'tech1', isActive: true }] };
      expect(() => service.validateTransitionRole(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, technician, ticket)).not.toThrow();
    });

    it('should NOT allow non-Technician to resolve ticket', () => {
      const ticket = { assignments: [{ technicianId: 'user1', isActive: true }] };
      expect(() => service.validateTransitionRole(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, creatorUser, ticket)).toThrow(ForbiddenException);
    });

    it('should NOT allow unassigned Technician to resolve ticket', () => {
      const ticket = { assignments: [{ technicianId: 'tech2', isActive: true }] };
      expect(() => service.validateTransitionRole(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, technician, ticket)).toThrow(ForbiddenException);
    });

    it('should allow supervisor to reassign IN_PROGRESS ticket', () => {
      expect(() => service.validateTransitionRole(TicketStatus.IN_PROGRESS, TicketStatus.ASSIGNED, supervisor, {})).not.toThrow();
    });

    it('should NOT allow technician to reassign IN_PROGRESS ticket', () => {
      expect(() => service.validateTransitionRole(TicketStatus.IN_PROGRESS, TicketStatus.ASSIGNED, technician, {})).toThrow(ForbiddenException);
    });

    it('should allow creator to close RESOLVED ticket', () => {
      const ticket = { createdById: 'user1' };
      expect(() => service.validateTransitionRole(TicketStatus.RESOLVED, TicketStatus.CLOSED, creatorUser, ticket)).not.toThrow();
    });

    it('should NOT allow other user to close RESOLVED ticket', () => {
      const ticket = { createdById: 'user1' };
      expect(() => service.validateTransitionRole(TicketStatus.RESOLVED, TicketStatus.CLOSED, otherUser, ticket)).toThrow(ForbiddenException);
    });

    it('should allow SYSTEM to close RESOLVED ticket', () => {
      const ticket = { createdById: 'user1' };
      expect(() => service.validateTransitionRole(TicketStatus.RESOLVED, TicketStatus.CLOSED, { role: 'SYSTEM' }, ticket)).not.toThrow();
    });
  });
});

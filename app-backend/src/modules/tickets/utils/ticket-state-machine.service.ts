import { Injectable, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { TicketStatus, RoleName } from '@prisma/client';

export const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.ASSIGNED, TicketStatus.REJECTED, TicketStatus.CANCELLED],
  [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.ASSIGNED],
  [TicketStatus.RESOLVED]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [],
  [TicketStatus.REJECTED]: [],
  [TicketStatus.CANCELLED]: [],
};

@Injectable()
export class TicketStateMachineService {
  canTransition(from: TicketStatus, to: TicketStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  validateTransition(from: TicketStatus, to: TicketStatus): void {
    if (!this.canTransition(from, to)) {
      throw new UnprocessableEntityException(`Invalid ticket transition from ${from} to ${to}`);
    }
  }

  getValidNextStatuses(from: TicketStatus): TicketStatus[] {
    return VALID_TRANSITIONS[from] || [];
  }

  validateTransitionRole(from: TicketStatus, to: TicketStatus, user: any, ticket: any): void {
    const role = user.role;
    
    // OPEN -> CANCELLED
    if (from === TicketStatus.OPEN && to === TicketStatus.CANCELLED) {
      if (ticket.createdById !== user.userId) {
        throw new ForbiddenException('Only ticket creator can cancel the ticket');
      }
      return;
    }

    // OPEN -> ASSIGNED | REJECTED
    if (from === TicketStatus.OPEN && (to === TicketStatus.ASSIGNED || to === TicketStatus.REJECTED)) {
      if (role !== RoleName.SUPERVISOR && role !== RoleName.ADMINISTRATOR) {
        throw new ForbiddenException('Only Supervisor or Administrator can assign or reject tickets');
      }
      return;
    }

    // ASSIGNED -> IN_PROGRESS
    if (from === TicketStatus.ASSIGNED && to === TicketStatus.IN_PROGRESS) {
      if (role !== RoleName.TECHNICIAN) {
        throw new ForbiddenException('Only Technician can start progress on assigned tickets');
      }
      const isAssigned = ticket.assignments?.some((a: any) => a.technicianId === user.userId && a.isActive);
      if (!isAssigned) {
        throw new ForbiddenException('You are not assigned to this ticket');
      }
      return;
    }

    // IN_PROGRESS -> RESOLVED
    if (from === TicketStatus.IN_PROGRESS && to === TicketStatus.RESOLVED) {
      if (role !== RoleName.TECHNICIAN) {
        throw new ForbiddenException('Only Technician can resolve tickets');
      }
      const isAssigned = ticket.assignments?.some((a: any) => a.technicianId === user.userId && a.isActive);
      if (!isAssigned) {
        throw new ForbiddenException('You are not assigned to this ticket');
      }
      return;
    }

    // IN_PROGRESS -> ASSIGNED (Reassign)
    if (from === TicketStatus.IN_PROGRESS && to === TicketStatus.ASSIGNED) {
      if (role !== RoleName.SUPERVISOR && role !== RoleName.ADMINISTRATOR) {
        throw new ForbiddenException('Only Supervisor or Administrator can reassign tickets');
      }
      return;
    }

    // RESOLVED -> IN_PROGRESS (Reopen)
    if (from === TicketStatus.RESOLVED && to === TicketStatus.IN_PROGRESS) {
      if (ticket.createdById !== user.userId && role !== RoleName.ADMINISTRATOR && role !== RoleName.SUPERVISOR) {
        throw new ForbiddenException('Only ticket creator can reopen the ticket');
      }
      return;
    }

    // RESOLVED -> CLOSED
    if (from === TicketStatus.RESOLVED && to === TicketStatus.CLOSED) {
      // Could be SYSTEM, but if user action:
      if (user.role === 'SYSTEM') return;
      if (ticket.createdById !== user.userId && role !== RoleName.ADMINISTRATOR && role !== RoleName.SUPERVISOR) {
        throw new ForbiddenException('Only ticket creator can close the ticket');
      }
      return;
    }
  }
}

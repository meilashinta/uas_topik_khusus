import { SetMetadata } from '@nestjs/common';
import { AuditLogAction } from '../../modules/audit-log/audit-log.service';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AuditAction = (action: AuditLogAction | string) => SetMetadata(AUDIT_ACTION_KEY, action);

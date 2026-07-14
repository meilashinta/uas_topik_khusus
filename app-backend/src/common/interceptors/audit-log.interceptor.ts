import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    
    // If no action is defined, just continue
    if (!action) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap((res) => {
        // Extract required metadata after successful response
        const user = req.user;
        const userId = user ? user.userId : null;
        
        // Try to get entityType and entityId
        // Assuming typical REST setup where the controller name or path suggests the entity type
        const routePath = req.route.path;
        let entityType = 'System';
        
        if (routePath.includes('users')) entityType = 'User';
        else if (routePath.includes('tickets')) entityType = 'Ticket';
        else if (routePath.includes('departments')) entityType = 'Department';
        else if (routePath.includes('categories')) entityType = 'Category';
        else if (routePath.includes('priorities')) entityType = 'Priority';
        else if (routePath.includes('auth')) entityType = 'Auth';

        // Get entity ID from route params, or body, or response object
        let entityId = req.params.id || res?.id || userId || '00000000-0000-0000-0000-000000000000';
        
        const metadata = {
          body: req.body,
          method: req.method,
          path: req.originalUrl,
          statusCode: context.switchToHttp().getResponse().statusCode,
        };

        // Fire and forget logging
        this.auditLogService.logAction(
          action,
          entityType,
          entityId,
          userId,
          metadata,
          req
        ).catch(err => console.error('Failed to log action from interceptor', err));
      }),
    );
  }
}

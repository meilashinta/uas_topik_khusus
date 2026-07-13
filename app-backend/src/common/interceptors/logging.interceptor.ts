import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    
    const method = request.method;
    const url = request.url;
    const userId = request.user?.id || 'anonymous';
    const correlationId = request.headers['x-correlation-id'];
    
    const now = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        const statusCode = response.statusCode;
        
        this.logger.log(
          JSON.stringify({
            method,
            url,
            userId,
            statusCode,
            responseTime: `${responseTime}ms`,
            correlationId,
          })
        );
      }),
    );
  }
}

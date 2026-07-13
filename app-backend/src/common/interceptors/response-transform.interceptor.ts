import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => {
        // If the data already matches ApiResponse format, return as is (useful for paginated results)
        if (data && typeof data === 'object' && 'success' in data && 'meta' in data) {
          return data;
        }
        
        return {
          success: true,
          data,
        };
      }),
    );
  }
}

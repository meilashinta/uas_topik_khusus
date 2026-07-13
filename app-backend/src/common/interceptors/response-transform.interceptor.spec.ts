import { ResponseTransformInterceptor } from './response-transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseTransformInterceptor();
  });

  it('should transform standard response to ApiResponse format', (done) => {
    const context = {} as ExecutionContext;
    const next: CallHandler = {
      handle: () => of({ myData: 'value' }),
    };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: { myData: 'value' },
      });
      done();
    });
  });

  it('should not wrap if data is already in ApiResponse format', (done) => {
    const context = {} as ExecutionContext;
    const paginatedResponse = {
      success: true,
      data: [{ id: 1 }],
      meta: { page: 1, limit: 10, total: 1 },
    };
    
    const next: CallHandler = {
      handle: () => of(paginatedResponse),
    };

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual(paginatedResponse);
      done();
    });
  });
});

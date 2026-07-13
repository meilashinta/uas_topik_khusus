import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();
      
      message = exception.message;
      if (typeof exceptionResponse === 'object' && exceptionResponse.message) {
        if (Array.isArray(exceptionResponse.message)) {
          details = exceptionResponse.message;
          message = 'Validation failed';
        } else {
          message = exceptionResponse.message;
        }
      }
      
      switch (status) {
        case 400: code = 'BAD_REQUEST'; break;
        case 401: code = 'UNAUTHORIZED'; break;
        case 403: code = 'FORBIDDEN'; break;
        case 404: code = 'NOT_FOUND'; break;
        case 409: code = 'CONFLICT'; break;
        case 422: code = 'UNPROCESSABLE_ENTITY'; break;
        case 429: code = 'TOO_MANY_REQUESTS'; break;
        default: code = 'HTTP_ERROR'; break;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      if (process.env.NODE_ENV !== 'production') {
        details = [exception.stack];
      }
    }

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: {
        code,
        message,
        details,
      },
    };

    response.status(status).json(errorResponse);
  }
}

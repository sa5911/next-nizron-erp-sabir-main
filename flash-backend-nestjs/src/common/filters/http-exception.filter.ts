import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = 
      exception instanceof HttpException
        ? exception.getResponse()
        : exception.message || 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message || message,
      error: typeof message === 'string' ? (status === 500 ? 'Internal Server Error' : 'Error') : (message as any).error || 'Error',
      stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
    };

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${typeof message === 'string' ? message : JSON.stringify(message)}`,
    );

    if (status === 500 && !(exception instanceof HttpException)) {
      this.logger.error(exception.stack);
    }

    response.status(status).json(errorResponse);
  }
}

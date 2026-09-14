import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[API ERROR]:', err);

  if (err instanceof ZodError) {
    const formattedErrors = (err.issues || []).map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Erros de validação nos dados enviados.',
      details: formattedErrors,
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor.';

  res.status(statusCode).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message,
  });
}

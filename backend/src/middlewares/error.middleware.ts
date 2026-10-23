import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  if (!err.statusCode || err.statusCode >= 500) console.error('[API ERROR]:', err);

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

  if (err.code === 'P2002') { res.status(409).json({ error: 'DUPLICATE_RECORD', message: 'Registro já cadastrado.' }); return; }
  if (err.code === 'P2003') { res.status(409).json({ error: 'LINKED_RECORD', message: 'O registro possui vínculos e não pode ser removido.' }); return; }
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode >= 500 ? 'Erro interno no servidor.' : err.message;

  res.status(statusCode).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message,
  });
}

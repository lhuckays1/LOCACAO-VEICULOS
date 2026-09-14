import { Request, Response, NextFunction } from 'express';
import { deepTransformToUppercase } from '../utils/formatters.js';

/**
 * Middleware that automatically converts all non-excluded input fields in request body to UPPERCASE
 */
export function uppercaseMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = deepTransformToUppercase(req.body);
  }
  next();
}

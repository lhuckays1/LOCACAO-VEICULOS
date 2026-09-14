import express from 'express';

import apiRouter from './routes/api.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

/**
 * ============================================================
 * MIDDLEWARES
 * ============================================================
 */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/**
 * ============================================================
 * API
 * ============================================================
 */

app.use('/api', apiRouter);

/**
 * ============================================================
 * ERROR HANDLER
 * ============================================================
 */

app.use('/api', errorHandler);

export default app;

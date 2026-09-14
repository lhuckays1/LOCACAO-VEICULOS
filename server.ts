import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRouter from './backend/src/routes/api.routes.js';
import { errorHandler } from './backend/src/middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 *
 * Todas as rotas da aplicação continuam utilizando:
 *
 * /api/auth
 * /api/admin
 * /api/companies
 * /api/clients
 * /api/vehicles
 * /api/dashboard
 * /api/rentals
 * /api/financial
 * /api/maintenance
 */
app.use('/api', apiRouter);

/**
 * ============================================================
 * ERROR HANDLER DA API
 * ============================================================
 */
app.use('/api', errorHandler);

/**
 * ============================================================
 * FRONTEND / VITE
 * ============================================================
 *
 * Desenvolvimento:
 * utiliza o Vite como middleware.
 *
 * Produção:
 * serve o conteúdo gerado pelo Vite.
 */
if (process.env.NODE_ENV !== 'production') {
  const startDevelopmentServer = async () => {
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  };

  void startDevelopmentServer().catch((error) => {
    console.error(
      '[FROTA CRM] Erro ao iniciar Vite:',
      error
    );
  });
} else {
  const distPath = path.join(
    __dirname,
    'dist'
  );

  app.use(
    express.static(distPath)
  );

  app.get('*', (_req, res) => {
    res.sendFile(
      path.join(
        distPath,
        'index.html'
      )
    );
  });
}

/**
 * ============================================================
 * EXPORTAÇÃO PARA A VERCEL
 * ============================================================
 *
 * A Vercel utiliza esta instância Express como sua
 * aplicação/serverless function.
 */
export default app;

/**
 * ============================================================
 * SERVIDOR LOCAL
 * ============================================================
 *
 * Quando executamos:
 *
 * npm run dev
 *
 * continuamos utilizando o Express normalmente em
 * http://localhost:3000
 */
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(
    process.env.PORT || 3000
  );

  app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `[FROTA CRM] Server running on http://0.0.0.0:${PORT}`
      );
    }
  );
}
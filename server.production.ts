import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './backend/src/app.js';

const publicPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
app.use(express.static(publicPath));
app.get('*', (_req, res) => res.sendFile(path.join(publicPath, 'index.html')));
const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`[FROTA CRM] http://0.0.0.0:${port}`));

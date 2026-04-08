import express from 'express';
import cors from 'cors';
import loginRouter from './routes/login.js';
import automatizacionesRouter from './routes/automatizaciones.js';
import usuariosRouter from './routes/usuarios.js';
import metasRouter from './routes/metas.js';
import exclusionesRouter from './routes/exclusiones.js';
import toleranciasRouter from './routes/tolerancias.js';
import importacionesRouter from './routes/importaciones.js';
import { applyMigrations } from './apply-migrations.js';
import { applyViews } from './apply-views.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/portal', loginRouter);
app.use('/api/portal', automatizacionesRouter);
app.use('/api/portal', usuariosRouter);
app.use('/api/portal', metasRouter);
app.use('/api/portal', exclusionesRouter);
app.use('/api/portal', toleranciasRouter);
app.use('/api/portal', importacionesRouter);

app.get('/api/portal/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await applyMigrations();
  await applyViews();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portal API running on port ${PORT}`);
  });
}

start();

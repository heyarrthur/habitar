import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

// ====== Mongo
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI não configurado');
  process.exit(1);
}
mongoose.connect(uri)
  .then(() => console.log('Mongo conectado'))
  .catch(err => { console.error('Erro no Mongo:', err); process.exit(1); });

// ====== App
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ====== Rotas (as suas)
import worksRoute from './routes/works.js';
import clientsRoute from './routes/clients.js';
import financeRoute from './routes/finance.js';
import teamRoute from './routes/team.js';
import budgetPresetsRoute from './routes/budgetPresets.js';

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/works', worksRoute);
app.use('/api/clients', clientsRoute);
app.use('/api/finance', financeRoute);
app.use('/api/team', teamRoute);
app.use('/api/budget-presets', budgetPresetsRoute);

// (opcional) rota catch-all 404 JSON:
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not Found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));

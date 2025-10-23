// backend/routes/finance.js
import express from 'express';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Listagem com filtros
router.get('/transactions', async (req, res) => {
  try {
    const { search = '', kind, status, category, dateFrom, dateTo } = req.query;
    const q = {};
    if (kind && ['Entrada', 'Saida'].includes(kind)) q.kind = kind;
    if (status && ['Pago', 'Pendente'].includes(status)) q.status = status;
    if (category) q.category = new RegExp(category, 'i');

    if (dateFrom || dateTo) {
      q.date = {};
      if (dateFrom) q.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        q.date.$lte = d;
      }
    }

    if (search) {
      const rx = new RegExp(search, 'i');
      q.$or = [{ description: rx }, { category: rx }, { method: rx }];
    }

    const items = await Transaction.find(q).sort({ date: -1, createdAt: -1 }).exec();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar transações', error: String(e) });
  }
});

// Criar
router.post('/transactions', async (req, res) => {
  try {
    const created = await Transaction.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: 'Erro ao criar transação', error: String(e) });
  }
});

// Obter por ID
router.get('/transactions/:id', async (req, res) => {
  try {
    const item = await Transaction.findById(req.params.id).exec();
    if (!item) return res.status(404).json({ message: 'Não encontrado' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar transação', error: String(e) });
  }
});

// Atualizar
router.put('/transactions/:id', async (req, res) => {
  try {
    const updated = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).exec();
    if (!updated) return res.status(404).json({ message: 'Não encontrado' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: 'Erro ao atualizar transação', error: String(e) });
  }
});

// Excluir
router.delete('/transactions/:id', async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id).exec();
    if (!deleted) return res.status(404).json({ message: 'Não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: 'Erro ao excluir transação', error: String(e) });
  }
});

export default router;

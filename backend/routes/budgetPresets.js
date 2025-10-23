// backend/routes/budgetPresets.js
import express from 'express';
import BudgetPreset from '../models/BudgetPreset.js';

const router = express.Router();

// Listar (com busca por nome)
router.get('/', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const q = search ? { name: new RegExp(search, 'i') } : {};
    const items = await BudgetPreset.find(q).sort({ createdAt: -1 }).exec();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar presets', error: String(e) });
  }
});

// Obter por ID
router.get('/:id', async (req, res) => {
  try {
    const item = await BudgetPreset.findById(req.params.id).exec();
    if (!item) return res.status(404).json({ message: 'Não encontrado' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar preset', error: String(e) });
  }
});

// Criar
router.post('/', async (req, res) => {
  try {
    const created = await BudgetPreset.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: 'Erro ao criar preset', error: String(e) });
  }
});

// Atualizar
router.put('/:id', async (req, res) => {
  try {
    const updated = await BudgetPreset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).exec();
    if (!updated) return res.status(404).json({ message: 'Não encontrado' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: 'Erro ao atualizar preset', error: String(e) });
  }
});

// Excluir
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await BudgetPreset.findByIdAndDelete(req.params.id).exec();
    if (!deleted) return res.status(404).json({ message: 'Não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: 'Erro ao excluir preset', error: String(e) });
  }
});

export default router;

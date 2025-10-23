import express from 'express';
import TeamMember from '../models/TeamMember.js';

const router = express.Router();

// Listar (com busca e filtro por status)
router.get('/', async (req, res) => {
  try {
    const { search = '', status } = req.query;
    const q = {};

    if (search) {
      const rx = new RegExp(search, 'i');
      q.$or = [
        { firstName: rx },
        { lastName: rx },
        { email: rx },
        { role: rx }
      ];
    }

    if (status && ['Ativo', 'Inativo'].includes(status)) {
      q.status = status;
    }

    const items = await TeamMember.find(q).sort({ createdAt: -1 }).exec();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar membros', error: String(err) });
  }
});

// Obter por ID
router.get('/:id', async (req, res) => {
  try {
    const item = await TeamMember.findById(req.params.id).exec();
    if (!item) return res.status(404).json({ message: 'Não encontrado' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar membro', error: String(err) });
  }
});

// Criar
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const created = await TeamMember.create(data);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: 'Erro ao criar membro', error: String(err) });
  }
});

// Atualizar
router.put('/:id', async (req, res) => {
  try {
    const updated = await TeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true }).exec();
    if (!updated) return res.status(404).json({ message: 'Não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Erro ao atualizar membro', error: String(err) });
  }
});

// Excluir
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await TeamMember.findByIdAndDelete(req.params.id).exec();
    if (!deleted) return res.status(404).json({ message: 'Não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: 'Erro ao excluir membro', error: String(err) });
  }
});

export default router;
// backend/routes/works.js
import express from 'express';
import mongoose from 'mongoose';
import Work from '../models/Work.js';

const router = express.Router();

/* -------------------------- Utils / Helpers -------------------------- */

function normalize(obj) {
  // Garante que virtuais (progressPercent) vão no JSON
  if (!obj) return obj;
  return obj.toObject ? obj.toObject({ virtuals: true }) : obj;
}

function withProgress(doc) {
  if (!doc) return doc;
  const o = normalize(doc);
  const total = (o.checklist || []).length;
  const done = (o.checklist || []).filter(i => i.done).length;
  o.progressPercent = total ? Math.round((done * 100) / total) : 0;
  return o;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/* ----------------------------- Listar (GET /) ----------------------------- */
/**
 * Suporta filtros/paginação:
 *   GET /api/works?search=...&status=Em%20andamento&page=1&limit=20
 * search: procura em title, responsibleName, clientSnapshot.name e status
 * status: Em andamento | Concluida | Pausada
 * page/limit: paginação opcional (default: 1/50)
 */
router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', page = '1', limit = '50' } = req.query;

    const q = {};
    if (status) q.status = status;
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      q.$or = [
        { title: rx },
        { responsibleName: rx },
        { 'clientSnapshot.name': rx },
        { status: rx },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skipNum = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Work.find(q).sort({ createdAt: -1 }).skip(skipNum).limit(limitNum).exec(),
      Work.countDocuments(q),
    ]);

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      data: items.map(withProgress),
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar obras', error: String(e) });
  }
});

/* ----------------------------- Criar (POST /) ----------------------------- */
/**
 * Aceita:
 * {
 *   title?, responsibleName?,
 *   client?, clientSnapshot?,
 *   status?,
 *   budgetPreset? (ObjectId)  OU  budgetManual? { materials:[], labor:[], discount }
 *   checklist?: [{ title, done? }]
 * }
 */
router.post('/', async (req, res) => {
  try {
    // Se vier os dois, priorizamos manual e anulamos preset por segurança
    const body = { ...req.body };
    if (body.budgetManual) body.budgetPreset = null;
    if (body.budgetPreset) body.budgetManual = null;

    const created = await Work.create(body);
    res.status(201).json(withProgress(created));
  } catch (e) {
    res.status(400).json({ message: 'Erro ao criar obra', error: String(e) });
  }
});

/* ------------------------- Buscar por ID (GET /:id) ------------------------ */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    const item = await Work.findById(id).populate('client').populate('budgetPreset').exec();
    if (!item) return res.status(404).json({ message: 'Não encontrado' });

    res.json(withProgress(item));
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar obra', error: String(e) });
  }
});

/* -------------------------- Atualizar (PUT /:id) -------------------------- */
/**
 * Atualiza campos gerais. Para checklist use os endpoints específicos abaixo.
 * Também mantém a regra: OU preset OU manual.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    const body = { ...req.body };
    if (body.budgetManual) body.budgetPreset = null;
    if (body.budgetPreset) body.budgetManual = null;

    const updated = await Work.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).exec();
    if (!updated) return res.status(404).json({ message: 'Não encontrado' });

    res.json(withProgress(updated));
  } catch (e) {
    res.status(400).json({ message: 'Erro ao atualizar obra', error: String(e) });
  }
});

/* -------------------------- Excluir (DELETE /:id) ------------------------- */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    const deleted = await Work.findByIdAndDelete(id).exec();
    if (!deleted) return res.status(404).json({ message: 'Não encontrado' });

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: 'Erro ao excluir obra', error: String(e) });
  }
});

/* ------------------ Checklist: adicionar item (PATCH /:id/checklist) ------------------ */
/**
 * body: { title: string }
 */
router.patch('/:id/checklist', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
    if (!title || !String(title).trim()) return res.status(400).json({ message: 'Título obrigatório' });

    const updated = await Work.findByIdAndUpdate(
      id,
      { $push: { checklist: { title: String(title).trim(), done: false } } },
      { new: true }
    ).exec();
    if (!updated) return res.status(404).json({ message: 'Obra não encontrada' });

    res.json(withProgress(updated));
  } catch (e) {
    res.status(400).json({ message: 'Erro ao adicionar item', error: String(e) });
  }
});

/* ------------- Checklist: alternar done (PATCH /:id/checklist/:itemId/toggle) ---------- */
router.patch('/:id/checklist/:itemId/toggle', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(itemId)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const work = await Work.findById(id).exec();
    if (!work) return res.status(404).json({ message: 'Obra não encontrada' });

    const item = (work.checklist || []).id(itemId);
    if (!item) return res.status(404).json({ message: 'Item não encontrado' });

    item.done = !item.done;
    await work.save();

    res.json(withProgress(work));
  } catch (e) {
    res.status(400).json({ message: 'Erro ao alternar item', error: String(e) });
  }
});

/* ---------------- Checklist: remover (DELETE /:id/checklist/:itemId) ------------------ */
router.delete('/:id/checklist/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(itemId)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const updated = await Work.findByIdAndUpdate(
      id,
      { $pull: { checklist: { _id: itemId } } },
      { new: true }
    ).exec();
    if (!updated) return res.status(404).json({ message: 'Obra/Item não encontrado' });

    res.json(withProgress(updated));
  } catch (e) {
    res.status(400).json({ message: 'Erro ao remover item', error: String(e) });
  }
});

/* --------------------- PÚBLICO: obras por cliente (GET /public/by-client/:clientId) --------------------- */
/**
 * Retorna uma lista “sanitizada” para o portal do cliente.
 * Campos: _id, title, responsibleName, status, createdAt, progressPercent, checklist (básico)
 */
router.get('/public/by-client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!isValidObjectId(clientId)) return res.status(400).json({ message: 'Client ID inválido' });

    const items = await Work.find({ client: clientId }).sort({ createdAt: -1 }).exec();

    const sanitized = items.map(w => {
      const x = withProgress(w);
      return {
        _id: x._id,
        title: x.title || (x.clientSnapshot?.name ? `Obra – ${x.clientSnapshot.name}` : 'Obra'),
        responsibleName: x.responsibleName || '',
        status: x.status,
        createdAt: x.createdAt,
        progressPercent: x.progressPercent,
        checklist: (x.checklist || []).map(i => ({
          _id: i._id,
          title: i.title,
          done: i.done,
          createdAt: i.createdAt,
        })),
      };
    });

    res.json(sanitized);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar obras do cliente', error: String(e) });
  }
});

/* --------------------- PÚBLICO: detalhes (GET /:id/public) --------------------- */
/**
 * Devolve os dados necessários para o painel do cliente:
 * progress, responsável, status, checklist (com datas),
 * orçamento: se for preset -> { type:'preset', name, presetId }
 *            se manual -> { type:'manual', materials[{ name, pricePerM2, areaM2, lineTotal }], labor[{ name, price }], discount }
 */
router.get('/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    const w = await Work.findById(id).populate('budgetPreset').exec();
    if (!w) return res.status(404).json({ message: 'Obra não encontrada' });

    const x = withProgress(w);
    const data = {
      _id: x._id,
      title: x.title || (x.clientSnapshot?.name ? `Obra – ${x.clientSnapshot.name}` : 'Obra'),
      responsibleName: x.responsibleName || '',
      status: x.status,
      createdAt: x.createdAt,
      progressPercent: x.progressPercent,
      checklist: (x.checklist || []).map(i => ({
        _id: i._id,
        title: i.title,
        done: i.done,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
      budget: x.budgetPreset
        ? { type: 'preset', name: x.budgetPreset?.name || 'Preset', presetId: x.budgetPreset?._id }
        : {
            type: 'manual',
            materials: (x.budgetManual?.materials || []).map(m => ({
              name: m.name,
              pricePerM2: Number(m.pricePerM2 || 0),
              areaM2: Number(m.areaM2 || 0),
              lineTotal: Number(m.pricePerM2 || 0) * Number(m.areaM2 || 0),
            })),
            labor: (x.budgetManual?.labor || []).map(l => ({
              name: l.name,
              price: Number(l.price || 0),
            })),
            discount: Number(x.budgetManual?.discount || 0),
          },
    };

    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar obra', error: String(e) });
  }
});

export default router;

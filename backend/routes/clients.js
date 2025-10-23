// backend/routes/clients.js
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Client from '../models/Client.js';

const router = express.Router();

function isValidObjectId(id) { return mongoose.Types.ObjectId.isValid(id); }

function slugifyBase(name='cliente'){
  return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 20) || 'cliente';
}
function randomDigits(n=3){ return Array.from({length:n}, ()=> Math.floor(Math.random()*10)).join(''); }
function generateUsername(name){
  const base = slugifyBase(name);
  return `${base}.${randomDigits(3)}`;
}
function generateTempPassword(){
  // 10 chars com letras/números
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let s=''; for(let i=0;i<10;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

/* ---------------------- GET /api/clients ---------------------- */
router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', page = '1', limit = '50' } = req.query;
    const q = {};
    if (status) q.status = status;
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      q.$or = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }, { username: rx }];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Client.find(q).sort({ createdAt: -1 }).skip(skip).limit(limitNum).exec(),
      Client.countDocuments(q)
    ]);
    res.json({ page: pageNum, limit: limitNum, total, data: items });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar clientes', error: String(e) });
  }
});

/* ---------------------- GET /api/clients/:id ---------------------- */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
    const c = await Client.findById(id).exec();
    if (!c) return res.status(404).json({ message: 'Não encontrado' });
    res.json(c);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar cliente', error: String(e) });
  }
});

/* ---------------------- POST /api/clients ---------------------- */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, status } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Nome é obrigatório' });

    // Gera credenciais
    let username = generateUsername(name);
    // garante unicidade tentando algumas vezes
    for (let i=0;i<5;i++){
      // eslint-disable-next-line no-await-in-loop
      const exists = await Client.findOne({ username }).lean();
      if (!exists) break;
      username = generateUsername(name);
    }
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const created = await Client.create({
      name: String(name).trim(),
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      company: company?.trim() || '',
      status: status || 'Ativo',
      username,
      passwordHash
    });

    // retorna a senha temporária somente agora
    res.status(201).json({ client: created, tempPassword });
  } catch (e) {
    // conflito de username único
    if (String(e).includes('duplicate key error') || e.code === 11000) {
      return res.status(409).json({ message: 'Username já existe, tente novamente.' });
    }
    res.status(400).json({ message: 'Erro ao criar cliente', error: String(e) });
  }
});

/* ---------------------- PUT /api/clients/:id ---------------------- */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    // não permitimos setar passwordHash diretamente aqui
    const { name, email, phone, company, status, username } = req.body || {};
    const update = {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(email !== undefined ? { email: String(email).trim().toLowerCase() } : {}),
      ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
      ...(company !== undefined ? { company: String(company).trim() } : {}),
      ...(status ? { status } : {}),
      ...(username ? { username: String(username).trim().toLowerCase() } : {}),
    };

    const updated = await Client.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
    if (!updated) return res.status(404).json({ message: 'Não encontrado' });
    res.json(updated);
  } catch (e) {
    if (String(e).includes('duplicate key error') || e.code === 11000) {
      return res.status(409).json({ message: 'Username já existe.' });
    }
    res.status(400).json({ message: 'Erro ao atualizar cliente', error: String(e) });
  }
});

/* ---------------------- DELETE /api/clients/:id ---------------------- */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
    const del = await Client.findByIdAndDelete(id).exec();
    if (!del) return res.status(404).json({ message: 'Não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: 'Erro ao excluir cliente', error: String(e) });
  }
});

/* ---------------------- PATCH /api/clients/:id/reset-password ---------------------- */
router.patch('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const updated = await Client.findByIdAndUpdate(id, { passwordHash }, { new: true }).exec();
    if (!updated) return res.status(404).json({ message: 'Não encontrado' });

    res.json({ client: updated, tempPassword });
  } catch (e) {
    res.status(400).json({ message: 'Erro ao resetar senha', error: String(e) });
  }
});

export default router;

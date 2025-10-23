// backend/models/Client.js
import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    status: { type: String, enum: ['Ativo', 'Inativo'], default: 'Ativo' },

    // Portal do cliente
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Client', ClientSchema);

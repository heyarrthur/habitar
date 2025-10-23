// backend/models/Transaction.js
import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['Entrada', 'Saida'], required: true }, // tipo
    status: { type: String, enum: ['Pago', 'Pendente'], default: 'Pago' },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    method: { type: String, trim: true }, // ex: Pix, Boleto, Cartão, Transferência
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },

    relatedClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    relatedWork: { type: mongoose.Schema.Types.ObjectId, ref: 'Work' }
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', TransactionSchema);

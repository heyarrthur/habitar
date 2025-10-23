// backend/models/Work.js
import mongoose from 'mongoose';

const ChecklistItemSchema = new mongoose.Schema(
  { title: { type: String, required: true, trim: true }, done: { type: Boolean, default: false } },
  { _id: true, timestamps: true }
);

// Orçamento manual (já tínhamos na sua versão)
const ManualMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    pricePerM2: { type: Number, min: 0, default: 0 },
    areaM2: { type: Number, min: 0, default: 0 } // área por material
  },
  { _id: true }
);
const ManualLaborSchema = new mongoose.Schema(
  { name: { type: String, trim: true, required: true }, price: { type: Number, min: 0, default: 0 } },
  { _id: true }
);
const BudgetManualSchema = new mongoose.Schema(
  { materials: { type: [ManualMaterialSchema], default: [] }, labor: { type: [ManualLaborSchema], default: [] }, discount: { type: Number, min: 0, default: 0 } },
  { _id: false }
);

const WorkSchema = new mongoose.Schema(
  {
    // NOVOS
    title: { type: String, trim: true, default: '' },          // Nome da obra
    responsibleName: { type: String, trim: true, default: ''}, // Responsável

    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientSnapshot: { type: Object },

    status: { type: String, default: 'Em andamento' },

    budgetPreset: { type: mongoose.Schema.Types.ObjectId, ref: 'BudgetPreset', default: null },
    budgetManual: { type: BudgetManualSchema, default: null },

    checklist: { type: [ChecklistItemSchema], default: [] }
  },
  { timestamps: true }
);

WorkSchema.virtual('progressPercent').get(function () {
  const total = (this.checklist || []).length;
  const done = (this.checklist || []).filter(i => i.done).length;
  return total ? Math.round((done * 100) / total) : 0;
});
WorkSchema.set('toJSON', { virtuals: true });
WorkSchema.set('toObject', { virtuals: true });

export default mongoose.model('Work', WorkSchema);

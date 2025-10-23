// backend/models/BudgetPreset.js
import mongoose from 'mongoose';

const PresetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  materials: [{
    name: { type: String, required: true, trim: true },
    pricePerM2: { type: Number, default: 0 },
    m2: { type: Number, default: 0 }
  }],
  labor: [{
    name: { type: String, required: true, trim: true },
    value: { type: Number, default: 0 }
  }],
  discount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('BudgetPreset', PresetSchema);

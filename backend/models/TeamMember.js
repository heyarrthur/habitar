import mongoose from 'mongoose';

const TeamMemberSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    birthDate: { type: Date },
    role: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    status: { type: String, enum: ['Ativo', 'Inativo'], default: 'Ativo' }
  },
  { timestamps: true }
);

TeamMemberSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

export default mongoose.model('TeamMember', TeamMemberSchema);
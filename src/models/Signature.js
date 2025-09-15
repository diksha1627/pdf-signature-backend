// Signature.js placeholder
const mongoose = require("mongoose");

const signatureSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    signerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    email: String,
    date: Date,
    signatureDataURL: String, // store base64 data URL (small) or store in Cloudinary
  },
  { timestamps: true }
);

module.exports = mongoose.model("Signature", signatureSchema);

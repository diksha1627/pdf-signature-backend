// Document.js placeholder
const mongoose = require("mongoose");
const { Schema } = mongoose;

const signatureSchema = new Schema(
  {
    fieldId: String,
    name: String,
    email: String,
    imageS3Key: String,
    signedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const documentSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  uploaderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  assigneeEmail: { type: String },
  s3KeyOriginal: String,
  s3KeySigned: String,
  status: {
    type: String,
    enum: ["PENDING", "SIGNED", "VERIFIED", "REJECTED", "COMPLETED"],
    default: "PENDING",
  },
  fields: { type: Schema.Types.Mixed },
  signatures: [signatureSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Document", documentSchema);

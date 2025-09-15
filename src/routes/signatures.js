// File: src/routes/signatures.js
const express = require("express");
const Signature = require("../models/Signature");
const Document = require("../models/Document");
const Audit = require("../models/Audit");
const { jwtAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/v1/documents/:id/sign
router.post(
  "/documents/:id/sign",
  jwtAuth,
  requireRole("SIGNER"),
  async (req, res) => {
    try {
      const { name, signatureDataURL } = req.body;
      if (!name || !signatureDataURL)
        return res.status(400).json({ error: "Missing name or signature" });

      const doc = await Document.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Document not found" });

      if (doc.assigneeEmail !== req.user.email)
        return res.status(403).json({ error: "Forbidden" });

      const signature = await Signature.create({
        documentId: doc._id,
        signerId: req.user._id,
        name,
        email: req.user.email,
        date: new Date(),
        signatureDataURL,
      });

      doc.signatures.push(signature._id);
      doc.status = "SIGNED";
      await doc.save();

      await Audit.create({
        userId: req.user._id,
        action: "DOCUMENT_SIGNED",
        meta: { documentId: doc._id, signatureId: signature._id },
      });

      res.json({ signature });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  }
);

// GET /api/v1/documents/:id/signatures
router.get(
  "/documents/:id/signatures",
  jwtAuth,
  async (req, res) => {
    try {
      const doc = await Document.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: "Document not found" });

      // Only uploader or signer can view
      if (
        doc.uploaderId.toString() !== req.user._id.toString() &&
        doc.assigneeEmail !== req.user.email
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const signatures = await Signature.find({ documentId: doc._id });
      res.json({ signatures });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  }
);

// GET /api/v1/signatures/:id
router.get("/signatures/:id", jwtAuth, async (req, res) => {
  try {
    const signature = await Signature.findById(req.params.id).populate(
      "documentId"
    );
    if (!signature) return res.status(404).json({ error: "Not found" });

    const doc = signature.documentId;

    // Only uploader or signer can view
    if (
      doc.uploaderId.toString() !== req.user._id.toString() &&
      signature.email !== req.user.email
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ signature });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

module.exports = {signatureRouter : router};

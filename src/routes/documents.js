const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const cloudinary = require("../config/coudinary"); // Fixed typo
const { jwtAuth, requireRole } = require("../middleware/auth");
const Document = require("../models/Document");
const User = require("../models/User");
const Audit = require("../models/Audit");

const upload = multer({ dest: "uploads/" }); // temporary storage
const router = express.Router();

// Upload document to Cloudinary
router.post("/", jwtAuth, requireRole("UPLOADER"), upload.single("file"), async (req, res) => {
  try {
    const { title, description, assigneeEmail } = req.body;

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Verify assignee exists and is a SIGNER
    const assignee = await User.findOne({ email: assigneeEmail, role: "SIGNER" });
    if (!assignee) {
      return res.status(400).json({ error: "Assignee not found or not a signer" });
    }

    // Upload PDF to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "documents",
      resource_type: "raw", // needed for PDFs
      public_id: `doc_${Date.now()}`, // custom public ID
    });

    const doc = await Document.create({
      title,
      description,
      filename: result.public_id, // Store Cloudinary public_id
      originalName: req.file.originalname,
      uploaderId: req.user._id,
      assigneeEmail,
      s3KeyOriginal: result.secure_url, // Cloudinary URL
      status: "PENDING",
    });

    await Audit.create({
      userId: req.user._id,
      action: "DOCUMENT_UPLOADED",
      meta: { documentId: doc._id },
    });

    // Clean up temporary file
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      console.error("Error cleaning up temp file:", error);
    }

    res.status(201).json({ document: doc });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// GET /api/v1/documents/documents - Get user's documents
router.get("/documents", jwtAuth, async (req, res) => {
  try {
    let docs;

    if (req.user.role === "UPLOADER") {
      docs = await Document.find({ uploaderId: req.user._id }).sort({
        createdAt: -1,
      });
    } else if (req.user.role === "SIGNER") {
      docs = await Document.find({ assigneeEmail: req.user.email }).sort({
        createdAt: -1,
      });
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ documents: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// GET /api/v1/documents/:id - Get single document
router.get("/:id", jwtAuth, async (req, res) => {
  try {
    console.log("Fetching document:", req.params.id);
    
    const document = await Document.findById(req.params.id);
    if (!document) {
      console.log("Document not found");
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (
      document.uploaderId.toString() !== req.user._id.toString() &&
      document.assigneeEmail !== req.user.email
    ) {
      console.log("Access denied - user not authorized");
      return res.status(403).json({ error: "Forbidden" });
    }

    console.log("Document found and authorized");
    res.json(document); // Return document directly to match frontend expectation
  } catch (err) {
    console.error("Get document error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// GET /api/v1/documents/:id/view-url - Get document view URL
router.get("/:id/view-url", jwtAuth, async (req, res) => {
  try {
    console.log("Getting view URL for document:", req.params.id);
    
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (
      document.uploaderId.toString() !== req.user._id.toString() &&
      document.assigneeEmail !== req.user.email
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Return Cloudinary URL directly for PDF viewing
    const viewUrl = document.s3KeyOriginal;
    
    console.log("Generated view URL:", viewUrl);
    res.json({ data: { viewUrl } });
  } catch (err) {
    console.error("Get view URL error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// GET /api/v1/documents/:id/file - Serve PDF file (redirect to Cloudinary)
router.get("/:id/file", jwtAuth, async (req, res) => {
  try {
    console.log("Serving file for document:", req.params.id);
    
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (
      document.uploaderId.toString() !== req.user._id.toString() &&
      document.assigneeEmail !== req.user.email
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Redirect to Cloudinary URL
    res.redirect(document.s3KeyOriginal);
  } catch (err) {
    console.error("Serve file error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /api/v1/documents/:id/sign - Sign document
router.post("/:id/sign", jwtAuth, requireRole("SIGNER"), async (req, res) => {
  try {
    console.log("Signing document:", req.params.id);
    
    const { name, signatureDataURL } = req.body;
    
    if (!name || !signatureDataURL) {
      return res.status(400).json({ error: "Missing name or signature" });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.assigneeEmail !== req.user.email) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (document.status !== "PENDING") {
      return res.status(400).json({ error: "Document cannot be signed" });
    }

    // Update document status and add signature info
    document.status = "SIGNED";
    document.signedAt = new Date();
    document.signerName = name;
    document.signatureDataURL = signatureDataURL;
    
    await document.save();

    await Audit.create({
      userId: req.user._id,
      action: "DOCUMENT_SIGNED",
      meta: { documentId: document._id },
    });

    console.log("Document signed successfully");
    res.json({ message: "Document signed successfully", document });
  } catch (err) {
    console.error("Sign document error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /api/v1/documents/:id/accept - Accept signed document
router.post("/:id/accept", jwtAuth, requireRole("UPLOADER"), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.uploaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (document.status !== "SIGNED") {
      return res.status(400).json({ error: "Document is not signed" });
    }

    document.status = "COMPLETED";
    document.completedAt = new Date();
    await document.save();

    await Audit.create({
      userId: req.user._id,
      action: "DOCUMENT_ACCEPTED",
      meta: { documentId: document._id },
    });

    res.json({ message: "Document accepted successfully", document });
  } catch (err) {
    console.error("Accept document error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /api/v1/documents/:id/reject - Reject signed document
router.post("/:id/reject", jwtAuth, requireRole("UPLOADER"), async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: "Rejection reason required" });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.uploaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (document.status !== "SIGNED") {
      return res.status(400).json({ error: "Document is not signed" });
    }

    document.status = "REJECTED";
    document.rejectedAt = new Date();
    document.rejectionReason = reason;
    await document.save();

    await Audit.create({
      userId: req.user._id,
      action: "DOCUMENT_REJECTED",
      meta: { documentId: document._id, reason },
    });

    res.json({ message: "Document rejected successfully", document });
  } catch (err) {
    console.error("Reject document error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

// DELETE /api/v1/documents/:id - Delete document
router.delete("/:id", jwtAuth, requireRole("UPLOADER"), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.uploaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(document.filename, { resource_type: "raw" });
    } catch (error) {
      console.error("Error deleting from Cloudinary:", error);
    }

    await Document.findByIdAndDelete(req.params.id);

    await Audit.create({
      userId: req.user._id,
      action: "DOCUMENT_DELETED",
      meta: { documentId: document._id },
    });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ error: "server_error" });
  }
});




module.exports = { docRouter: router };

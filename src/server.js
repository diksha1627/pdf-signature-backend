// server.js placeholder
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const { authRouter } = require("./routes/auth.js");
const { userRouter } = require("./routes/users.js");
const { docRouter } = require("./routes/documents.js");
const { signatureRouter } = require("./routes/signatures.js");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 4000;

async function start() {
  await mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB");

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/documents", docRouter);
  app.use("/api/v1/signatures", signatureRouter);

  app.get("/", (req, res) => res.json({ ok: true }));

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

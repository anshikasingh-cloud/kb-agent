require("dotenv").config({ path: `${__dirname}/.env` });
const express = require("express");
const cors = require("cors");
const chatRouter = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://crm.zoho.com";

// Validate required env vars at startup
const REQUIRED_VARS = ["OPENAI_API_KEY", "ASSISTANT_ID"];
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`ERROR: Missing required environment variable: ${v}`);
    process.exit(1);
  }
}

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ["POST", "GET"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/chat", chatRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`KB Agent backend running on port ${PORT}`);
  console.log(`Accepting requests from: ${ALLOWED_ORIGIN}`);
});

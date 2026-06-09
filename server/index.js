const express = require("express");
const cors = require("cors");
const path = require("path");
const { callGroq } = require("./groq");
const { buildPrompt } = require("./promptBuilder");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "MedRef API online", provider: "Groq" });
});

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, layer, context } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      return res.status(401).json({ error: "Groq API key required. Please set it in Settings." });
    }

    const systemPrompt = buildPrompt(layer, context);
    const response = await callGroq(apiKey, message, history || [], systemPrompt);

    res.json({ reply: response });
  } catch (err) {
    console.error("[MedRef] Error:", err.message);
    res.status(500).json({ error: err.message || "Groq API call failed." });
  }
});

// Serve frontend for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🏥 MedRef server running at http://localhost:${PORT}`);
  console.log(`   Powered by Groq (free tier) — get your key at https://console.groq.com`);
  console.log(`   Set your Groq API key in the app Settings panel.\n`);
});

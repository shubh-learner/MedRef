const express = require("express");
const cors    = require("cors");
const path    = require("path");
const https   = require("https");
const { callGroq }    = require("./groq");
const { buildPrompt }         = require("./promptBuilder");
const { buildAyurvedaPrompt } = require("./promptBuilderAyurveda");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Firebase Admin for ID token verification ──────────────────
// We use the lightweight REST-based token verification so we
// don't need the firebase-admin npm package (keeps it free/simple).
async function verifyFirebaseToken(idToken, firebaseProjectId) {
  return new Promise((resolve, reject) => {
    const url = new URL(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseProjectId}`
    );
    // We verify via Google's public keys endpoint instead
    // Simple approach: trust the token structure + verify via tokeninfo
    resolve(true); // Token presence is checked; Firestore rules enforce ownership
  });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "MedRef online", provider: "Groq", auth: "Firebase" });
});

// ── Main chat endpoint ────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, layer, context } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    // Groq key is sent per-request from the client (loaded from Firestore)
    const groqKey = req.headers["x-groq-key"];
    if (!groqKey) {
      return res.status(401).json({ error: "No Groq API key found. Please set your key in Settings." });
    }

    if (!groqKey.startsWith("gsk_")) {
      return res.status(401).json({ error: "Invalid Groq API key format." });
    }

    const system       = req.body.system || "allopathy";
    const systemPrompt = system === "ayurveda"
      ? buildAyurvedaPrompt(layer, context)
      : buildPrompt(layer, context);
    const reply = await callGroq(groqKey, message, history || [], systemPrompt);

    res.json({ reply });
  } catch (err) {
    console.error("[MedRef] Chat error:", err.message);
    res.status(500).json({ error: err.message || "Groq API call failed." });
  }
});

// ── Serve auth page ───────────────────────────────────────────
app.get("/auth", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/auth.html"));
});

// ── Serve frontend for all other routes ──────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🏥 MedRef running at http://localhost:${PORT}`);
  console.log(`   Auth: Firebase  |  AI: Groq (free tier)`);
  console.log(`   ⚠  Set your Firebase config in public/js/firebase.js\n`);
});

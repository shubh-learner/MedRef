const { callGroq }            = require("../server/groq");
const { buildPrompt }         = require("../server/promptBuilder");
const { buildAyurvedaPrompt } = require("../server/promptBuilderAyurveda");

export default async function handler(req, res) {
  // CORS headers — needed for browser fetch calls
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-groq-key");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { message, history, layer, context, system } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const groqKey = req.headers["x-groq-key"];
    if (!groqKey) {
      return res.status(401).json({ error: "No Groq API key found. Please set your key in Settings." });
    }
    if (!groqKey.startsWith("gsk_")) {
      return res.status(401).json({ error: "Invalid Groq API key format." });
    }

    const systemPrompt = system === "ayurveda"
      ? buildAyurvedaPrompt(layer, context)
      : buildPrompt(layer, context);

    const reply = await callGroq(groqKey, message, history || [], systemPrompt);

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("[MedRef] Chat error:", err.message);
    return res.status(500).json({ error: err.message || "Groq API call failed." });
  }
}
const https = require("https");

const MODELS = [
  "gemini-2.5-flash-lite-preview-06-17",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

/**
 * Makes a single HTTP request to Gemini API.
 */
function requestGemini(apiKey, model, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    );

    const body = JSON.stringify(payload);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            const code = parsed.error.code || 0;
            const msg  = parsed.error.message || "Gemini API error";
            const err  = new Error(msg);
            err.code   = code;
            return reject(err);
          }
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) return reject(new Error("Empty response from Gemini API."));
          resolve(text);
        } catch (e) {
          reject(new Error("Failed to parse Gemini response."));
        }
      });
    });

    req.on("error", (e) => reject(new Error(`Network error: ${e.message}`)));
    req.write(body);
    req.end();
  });
}

/**
 * Calls Gemini API with automatic model fallback and retry on 429.
 */
async function callGemini(apiKey, userMessage, history, systemPrompt) {
  const contents = [];

  for (const turn of history) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    });
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  let lastError;

  for (const model of MODELS) {
    try {
      console.log(`[MedRef] Trying model: ${model}`);
      const text = await requestGemini(apiKey, model, payload);
      console.log(`[MedRef] Success with model: ${model}`);
      return text;
    } catch (err) {
      lastError = err;
      const isQuota = err.code === 429 || err.message.toLowerCase().includes("quota");
      const isNotFound = err.code === 404 || err.message.toLowerCase().includes("not found");

      if (isQuota || isNotFound) {
        // Try next model in fallback list
        console.warn(`[MedRef] Model ${model} failed (${err.message}), trying next...`);
        continue;
      }

      // Auth or other hard error — don't retry
      if (err.code === 403 || err.message.toLowerCase().includes("api key")) {
        throw new Error("Invalid API key. Please check your Gemini API key in Settings.");
      }
      throw err;
    }
  }

  // All models exhausted
  throw new Error(
    "All Gemini models returned quota errors. You've likely hit the free tier daily limit (500 req/day). " +
    "Please wait 24 hours or create a new API key in a new Google Cloud project at https://aistudio.google.com/apikey"
  );
}

module.exports = { callGemini };

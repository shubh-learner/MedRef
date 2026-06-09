const https = require("https");

// Groq free tier models — ordered by capability, fallback on rate limit
const MODELS = [
  "llama-3.3-70b-versatile",   // Best quality, 30 RPM free
  "llama-3.1-8b-instant",      // Faster, higher limits
  "gemma2-9b-it",              // Last resort fallback
];

const GROQ_API_URL = "api.groq.com";
const GROQ_API_PATH = "/openai/v1/chat/completions"; // Groq uses OpenAI-compatible API

/**
 * Makes a single HTTPS request to Groq API.
 */
function requestGroq(apiKey, model, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 2048,
    });

    const options = {
      hostname: GROQ_API_URL,
      path: GROQ_API_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);

          // Groq error format
          if (parsed.error) {
            const err = new Error(parsed.error.message || "Groq API error");
            err.code = res.statusCode;
            err.type = parsed.error.type || "";
            return reject(err);
          }

          const text = parsed?.choices?.[0]?.message?.content;
          if (!text) return reject(new Error("Empty response from Groq API."));
          resolve(text);
        } catch (e) {
          reject(new Error("Failed to parse Groq response: " + e.message));
        }
      });
    });

    req.on("error", (e) => reject(new Error(`Network error: ${e.message}`)));
    req.write(body);
    req.end();
  });
}

/**
 * Calls Groq API with system prompt, history, and user message.
 * Automatically falls back to next model on rate limit (429).
 *
 * @param {string} apiKey       - Groq API key (starts with gsk_)
 * @param {string} userMessage  - Current user message
 * @param {Array}  history      - [{role, text}] previous turns
 * @param {string} systemPrompt - MedRef system instructions
 * @returns {Promise<string>}   - AI response text
 */
async function callGroq(apiKey, userMessage, history, systemPrompt) {
  // Build OpenAI-format messages array
  const messages = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history
  for (const turn of history) {
    messages.push({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: turn.text,
    });
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  let lastError;

  for (const model of MODELS) {
    try {
      console.log(`[MedRef] Trying Groq model: ${model}`);
      const text = await requestGroq(apiKey, model, messages);
      console.log(`[MedRef] ✓ Success with: ${model}`);
      return text;
    } catch (err) {
      lastError = err;
      const isRateLimit = err.code === 429 || (err.message || "").toLowerCase().includes("rate limit");
      const isNotFound  = err.code === 404 || (err.message || "").toLowerCase().includes("not found");

      if (isRateLimit || isNotFound) {
        console.warn(`[MedRef] Model ${model} failed (${err.message}), trying next...`);
        // Wait 1 second before trying next model
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // Auth error — no point retrying
      if (err.code === 401 || (err.message || "").toLowerCase().includes("invalid api key")) {
        throw new Error(
          "Invalid Groq API key. Please check your key in Settings.\n" +
          "Get a free key at: https://console.groq.com"
        );
      }

      // Any other hard error
      throw new Error(`Groq API error: ${err.message}`);
    }
  }

  // All models exhausted
  throw new Error(
    "All Groq models are currently rate-limited. " +
    "Free tier limit: 30 req/min, 14,400 req/day. " +
    "Please wait a minute and try again."
  );
}

module.exports = { callGroq };

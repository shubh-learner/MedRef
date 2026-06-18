/**
 * MedRef Layer Detector
 * Analyzes user input text to determine which workflow layer is active.
 * Returns the appropriate layer string: "1", "2", "3", "4", or "5".
 */

/**
 * @param {string} text - User's input message
 * @param {string} currentLayer - Current active layer
 * @param {object} context - Session context {disease, medicine}
 * @returns {string} - Layer identifier
 */
export function detectLayer(text, currentLayer, context) {
  const lower = text.toLowerCase().trim();

  // ── Layer 5: Specific medicine lookup ─────────────────────
  if (
    /(look up|lookup|what about|tell me about|profile of|details of|info on)?\s*[a-z]+\b/i.test(text) &&
    currentLayer === "4"
  ) {
    context.medicine = text.trim();
    return "5";
  }

  // Another medicine in 5
  if (currentLayer === "5" && /(another medicine|look up|lookup)\s+/i.test(lower)) {
    return "5";
  }

  // ── Layer 4: After selecting a disease for management ──────
  if (
    currentLayer === "3" &&
    /(medicine for|go with|drug|medicine|pharmacol|treatment|rx|prescri)/i.test(lower)
  ) {
    return "4";
  }

  // ── Layer 3: User selects a single disease from differentials ─
  if (
    currentLayer === "2" &&
    /^(no|proceed with|go with|use|select|choose|pick)\b/i.test(lower)
  ) {
    // "no" → stop comparing, move to layer 3
    if (/^no\b/i.test(lower)) {
      return "3";
    }
    context.disease = lower.replace(/^(proceed with|let's go with|use|select|choose|pick)\s*/i, "").trim();
    return "3";
  }

  // If user just types a disease name after being prompted at end of layer 2
  if (
    currentLayer === "2" &&
    !/compare|yes|no/i.test(lower) &&
    lower.length > 3
  ) {
    context.disease = text.trim();
    return "3";
  }

  // ── Layer 2: Compare request ───────────────────────────────
  if (/compare\s+\d+\s+(and|with|vs\.?)\s+\d+/i.test(lower)) {
    return "2";
  }
  if (/^(yes|compare again|another comparison)/i.test(lower) && currentLayer === "2") {
    return "2";
  }

  // ── Layer 1: Default / new symptom description ────────────
  // New consultation always starts at layer 1
  if (
    currentLayer === "1" ||
    /(symptom|present|complain|patient|year.old|history|chief complaint|c\/c)/i.test(lower)
  ) {
    return "1";
  }

  // ── Fallback: stay on current layer ───────────────────────
  return currentLayer;
}

/**
 * MedRef Layer Detector
 * Handles layer transitions for both Allopathy and Ayurveda systems.
 */

export function detectLayer(text, currentLayer, context, system = "allopathy") {
  if (system === "ayurveda") {
    return detectAyurvedaLayer(text, currentLayer, context);
  }
  return detectAllopathyLayer(text, currentLayer, context);
}

// ── Ayurveda Layer Transitions ─────────────────────────────────
// Layer "1" → Rogi Pariksha & Nidana
// Layer "2" → Pathya-Apathya & Chikitsa
// Layer "3" → Aushadhi Chikitsa
// Layer "4" → Rasāyana Vijñāna 
function detectAyurvedaLayer(text, currentLayer, context) {
  const lower = text.toLowerCase().trim();
   // Layer 1 to 1
  if (
    currentLayer === "1" &&
    /(symptom|present|Rogi|patient|year|Prakriti|Koshtha|Jatharagni|chief complaint|c\/c)/i.test(lower)
  ) {
    return "1";
  }
  // Layer 1 to 2
  if (
    currentLayer === "1" &&
    /(yes|pathya|apathya|chikitsa|diet|lifestyle|management|proceed|vihara|niyama|shodhana|shamana|panchakarma|haan|sure|ok|please)/i.test(lower)
  ) {
    return "2";
  }

  // Layer 2 to 3
  if (
    currentLayer === "2" &&
    /(yes|aushadhi|medicine|prescri|drug|formul|rasayana|haan|sure|ok|please|medication)/i.test(lower)
  ) {
    return "3";
  }

  
  // Layer 3: Medicine/Aushadhi lookup
  if (
    /\b(yes|go ahead|churna|kwatha|arista|guggulu|ghrita|taila|rasayana|bhasma|vati|asava|lehya|avaleha)\b/i.test(lower) &&
    (currentLayer === "3")
  ) {
    return "4";
  }
  // Stay on current layer by default
  return currentLayer;
}

// ************Allopathy Layer Transitions ******************************************************

function detectAllopathyLayer(text, currentLayer, context) {
const lower = text.toLowerCase().trim();

  // ── Layer 5: Specific medicine lookup ─────────────────────
  if (
    /(look up|lookup|what about|tell me about|go with|details of|info on)/i.test(text) &&
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
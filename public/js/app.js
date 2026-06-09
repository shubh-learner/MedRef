/**
 * MedRef Frontend — Main App Logic
 * Handles UI state, chat flow, layer transitions, and API calls.
 */

import { renderMarkdown } from "./markdown.js";
import { detectLayer } from "./layerDetector.js";

// ── State ──────────────────────────────────────────────────────
const state = {
  history: [],          // [{role: "user"|"assistant", text: "..."}]
  currentLayer: "1",
  context: {},          // e.g. {disease: "Tuberculosis", medicine: "Rifampicin"}
  isLoading: false,
};

// ── DOM References ─────────────────────────────────────────────
const messagesEl    = document.getElementById("messages");
const welcomeEl     = document.getElementById("welcome-screen");
const chatInput     = document.getElementById("user-input");
const sendBtn       = document.getElementById("send-btn");
const layerBadgeEl  = document.getElementById("layer-badge");
const statusDot     = document.getElementById("status-dot");
const statusText    = document.getElementById("status-text");
const keyWarning    = document.getElementById("key-warning");
const settingsModal = document.getElementById("settings-modal");
const apiKeyInput   = document.getElementById("api-key-input");
const keyStatus     = document.getElementById("key-status");

// ── Initialise ─────────────────────────────────────────────────
(function init() {
  const savedKey = localStorage.getItem("medref_api_key");
  if (!savedKey) {
    keyWarning.classList.add("visible");
  }

  // Auto-grow textarea
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
  });

  // Send on Enter (Shift+Enter = newline)
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener("click", handleSend);

  document.getElementById("settings-btn").addEventListener("click", openSettings);
  document.getElementById("modal-close").addEventListener("click", closeSettings);
  document.getElementById("save-key-btn").addEventListener("click", saveApiKey);
  document.getElementById("new-consult-btn").addEventListener("click", startNewConsult);
  document.getElementById("key-warning-btn").addEventListener("click", openSettings);

  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  // Layer nav click (manual override)
  document.querySelectorAll(".layer-item").forEach((item) => {
    item.addEventListener("click", () => {
      setLayer(item.dataset.layer);
    });
  });
})();

// ── Settings ───────────────────────────────────────────────────
function openSettings() {
  const saved = localStorage.getItem("medref_api_key") || "";
  apiKeyInput.value = saved;
  keyStatus.textContent = "";
  settingsModal.classList.remove("hidden");
}

function closeSettings() {
  settingsModal.classList.add("hidden");
}

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key || !key.startsWith("gsk_")) {
    keyStatus.textContent = "Invalid key format. Groq keys start with 'gsk_'.";
    keyStatus.className = "key-status error";
    return;
  }
  localStorage.setItem("medref_api_key", key);
  keyStatus.textContent = "✓ Groq API key saved successfully.";
  keyStatus.className = "key-status success";
  keyWarning.classList.remove("visible");
  setTimeout(closeSettings, 1200);
}

// ── New Consult ────────────────────────────────────────────────
function startNewConsult() {
  state.history = [];
  state.currentLayer = "1";
  state.context = {};
  messagesEl.innerHTML = "";
  welcomeEl.style.display = "flex";
  setLayer("1");
  chatInput.value = "";
  chatInput.style.height = "auto";
}

// ── Layer Management ───────────────────────────────────────────
function setLayer(layer) {
  state.currentLayer = layer;

  const labels = {
    "1": "Layer 1 · Differential Diagnosis",
    "2": "Layer 2 · Disease Comparison",
    "3": "Layer 3 · Precautions & Management",
    "4": "Layer 4 · Medication Reference",
    "4b": "Layer 4B · Medicine Lookup",
  };

  layerBadgeEl.textContent = labels[layer] || labels["1"];

  document.querySelectorAll(".layer-item").forEach((item) => {
    item.classList.remove("active");
  });
  const activeNav = document.querySelector(`.layer-item[data-layer="${layer}"]`);
  if (activeNav) activeNav.classList.add("active");
}

// ── Status ─────────────────────────────────────────────────────
function setStatus(status, message) {
  statusDot.className = "status-dot " + (status === "loading" ? "loading" : status === "error" ? "error" : "");
  statusText.textContent = message;
}

// ── Send Message ───────────────────────────────────────────────
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text || state.isLoading) return;

  const apiKey = localStorage.getItem("medref_api_key");
  if (!apiKey) {
    openSettings();
    return;
  }

  // Hide welcome screen after first message
  if (welcomeEl.style.display !== "none") {
    welcomeEl.style.display = "none";
  }

  // Detect if layer should transition based on user input
  const detectedLayer = detectLayer(text, state.currentLayer, state.context);
  if (detectedLayer !== state.currentLayer) {
    setLayer(detectedLayer);
  }

  // Append user message
  appendMessage("user", text);
  state.history.push({ role: "user", text });
  chatInput.value = "";
  chatInput.style.height = "auto";

  // Loading state
  state.isLoading = true;
  sendBtn.disabled = true;
  setStatus("loading", "Consulting Groq...");
  const typingEl = appendTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        message: text,
        history: state.history.slice(-14), // last 7 turns
        layer: state.currentLayer,
        context: state.context,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Server error");
    }

    typingEl.remove();
    appendMessage("assistant", data.reply);
    state.history.push({ role: "assistant", text: data.reply });

    // Auto-advance context: extract disease name if layer 3 response
    if (state.currentLayer === "3" && !state.context.disease) {
      state.context.disease = extractDiseaseName(text);
    }

    setStatus("", "Ready");
  } catch (err) {
    typingEl.remove();
    appendError(err.message);
    setStatus("error", "Error");
  } finally {
    state.isLoading = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// ── DOM Helpers ────────────────────────────────────────────────
function appendMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  meta.innerHTML = `
    <span class="msg-role ${role}">${role === "user" ? "CLINICIAN" : "MEDREF"}</span>
    <span>${now}</span>
  `;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (role === "assistant") {
    bubble.innerHTML = renderMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  wrap.appendChild(meta);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function appendTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message assistant typing-indicator";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.innerHTML = `<span class="msg-role assistant">MEDREF</span>`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  wrap.appendChild(meta);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function appendError(msg) {
  const wrap = document.createElement("div");
  wrap.className = "message assistant";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.style.borderColor = "rgba(224, 83, 83, 0.3)";
  bubble.style.background = "rgba(224, 83, 83, 0.05)";
  bubble.style.color = "#e05353";
  bubble.textContent = `⚠ Error: ${msg}`;
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollToBottom();
}

function scrollToBottom() {
  const area = document.getElementById("chat-area");
  area.scrollTop = area.scrollHeight;
}

function extractDiseaseName(userText) {
  // Basic heuristic: capture last noun phrase or return as-is
  return userText.replace(/^proceed with\s*/i, "").trim() || "Selected Condition";
}

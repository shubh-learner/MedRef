/**
 * MedRef — Main App
 * Firebase auth guards this page. Groq key loaded from Firestore on login.
 * Each user has their own key stored securely in their Firestore document.
 */

import { renderMarkdown }                           from "./markdown.js";
import { detectLayer }                              from "./layerDetector.js";
import { onAuthChange, logoutUser }                 from "./auth.js";
import { loadGroqKey, saveGroqKey }                 from "./keyStore.js";

// ── Session state ──────────────────────────────────────────────
const state = {
  history:      [],
  currentLayer: "1",
  context:      {},
  isLoading:    false,
  groqKey:      null,
  user:         null,
};

// ── DOM refs ───────────────────────────────────────────────────
const messagesEl    = document.getElementById("messages");
const welcomeEl     = document.getElementById("welcome-screen");
const chatInput     = document.getElementById("user-input");
const sendBtn       = document.getElementById("send-btn");
const layerBadgeEl  = document.getElementById("layer-badge");
const statusDot     = document.getElementById("status-dot");
const statusText    = document.getElementById("status-text");
const settingsModal = document.getElementById("settings-modal");
const apiKeyInput   = document.getElementById("api-key-input");
const keyStatus     = document.getElementById("key-status");
const userNameEl    = document.getElementById("user-name");
const userEmailEl   = document.getElementById("user-email");
const userAvatarEl  = document.getElementById("user-avatar");
const keyBanner     = document.getElementById("key-banner");

// ── Boot: Firebase auth guard ──────────────────────────────────
onAuthChange(async (user) => {
  if (!user) {
    window.location.href = "/auth";
    return;
  }

  state.user = user;

  // Populate sidebar user badge
  const name = user.displayName || user.email.split("@")[0];
  if (userNameEl)   userNameEl.textContent  = name;
  if (userEmailEl)  userEmailEl.textContent = user.email;
  if (userAvatarEl) userAvatarEl.textContent = name.charAt(0).toUpperCase();

  // Load Groq key from Firestore
  setStatus("loading", "Loading profile...");
  try {
    const key = await loadGroqKey(user.uid);
    if (key) {
      state.groqKey = key;
      showKeyBanner(true);
      setStatus("", "Made with ❤️ by Shubh Arya");
    } else {
      showKeyBanner(false);
      setStatus("error", "No API key");
      openSettings(); // first-time: prompt for key
    }
  } catch (err) {
    console.error("Firestore key load failed:", err);
    setStatus("error", "Key load failed");
  }
});

// ── Init UI ────────────────────────────────────────────────────
(function initUI() {
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  sendBtn.addEventListener("click", handleSend);
  document.getElementById("settings-btn").addEventListener("click", openSettings);
  document.getElementById("modal-close").addEventListener("click", closeSettings);
  document.getElementById("save-key-btn").addEventListener("click", saveKey);
  document.getElementById("new-consult-btn").addEventListener("click", startNewConsult);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);

  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  document.querySelectorAll(".layer-item").forEach((item) => {
    item.addEventListener("click", () => setLayer(item.dataset.layer));
  });
})();

// ── Settings ───────────────────────────────────────────────────
function openSettings() {
  // Show masked key if one exists, clear on focus so user can retype
  apiKeyInput.value     = state.groqKey ? "gsk_" + "•".repeat(20) : "";
  keyStatus.textContent = "";
  keyStatus.className   = "key-status";
  settingsModal.classList.remove("hidden");
  apiKeyInput.addEventListener("focus", () => {
    if (apiKeyInput.value.includes("•")) apiKeyInput.value = "";
  }, { once: true });
}

function closeSettings() {
  settingsModal.classList.add("hidden");
}

async function saveKey() {
  const key = apiKeyInput.value.trim();
  if (!key || !key.startsWith("gsk_")) {
    keyStatus.textContent = "Invalid key. Groq keys start with 'gsk_'.";
    keyStatus.className   = "key-status error";
    return;
  }
  const btn = document.getElementById("save-key-btn");
  btn.disabled = true; btn.textContent = "Saving...";
  try {
    await saveGroqKey(state.user.uid, key);
    state.groqKey         = key;
    keyStatus.textContent = "✓ Key saved to your account.";
    keyStatus.className   = "key-status success";
    showKeyBanner(true);
    setStatus("", "Made with ❤️ by Shubh Arya");
    setTimeout(closeSettings, 1200);
  } catch (err) {
    keyStatus.textContent = "Save failed. Check Firestore security rules.";
    keyStatus.className   = "key-status error";
  } finally {
    btn.disabled = false; btn.textContent = "Save Key";
  }
}

// ── Logout ─────────────────────────────────────────────────────
async function handleLogout() {
  await logoutUser();
  window.location.href = "/auth";
}

// ── New consult ────────────────────────────────────────────────
function startNewConsult() {
  state.history = []; state.currentLayer = "1"; state.context = {};
  messagesEl.innerHTML = "";
  welcomeEl.style.display = "flex";
  setLayer("1");
  chatInput.value = ""; chatInput.style.height = "auto";
}

// ── Layer ──────────────────────────────────────────────────────
function setLayer(layer) {
  state.currentLayer = layer;
  const labels = {
    "1":  "Layer 1 · Differential Diagnosis",
    "2":  "Layer 2 · Disease Comparison",
    "3":  "Layer 3 · Precautions & Management",
    "4":  "Layer 4 · Medication Reference",
    "4b": "Layer 4B · Medicine Lookup",
  };
  layerBadgeEl.textContent = labels[layer] || labels["1"];
  document.querySelectorAll(".layer-item").forEach((el) => el.classList.remove("active"));
  const active = document.querySelector(`.layer-item[data-layer="${layer}"]`);
  if (active) active.classList.add("active");
}

// ── Status ─────────────────────────────────────────────────────
function setStatus(type, message) {
  statusDot.className    = "status-dot" + (type === "loading" ? " loading" : type === "error" ? " error" : "");
  statusText.textContent = message;
}

// ── Key banner ─────────────────────────────────────────────────
function showKeyBanner(hasKey) {
  if (!keyBanner) return;
  keyBanner.className = "key-banner visible " + (hasKey ? "ok" : "missing");
  keyBanner.innerHTML = hasKey ? "✓ Groq key active" : "⚠ Set your Groq key";
  keyBanner.onclick   = hasKey ? null : openSettings;
}

// ── Send ───────────────────────────────────────────────────────
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text || state.isLoading) return;

  if (!state.groqKey) { openSettings(); return; }

  welcomeEl.style.display = "none";

  const detected = detectLayer(text, state.currentLayer, state.context);
  if (detected !== state.currentLayer) setLayer(detected);

  appendMessage("user", text);
  state.history.push({ role: "user", text });
  chatInput.value = ""; chatInput.style.height = "auto";

  state.isLoading = true; sendBtn.disabled = true;
  setStatus("loading", "Consulting Groq...");
  const typingEl = appendTyping();

  try {
    const res  = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-groq-key": state.groqKey },
      body: JSON.stringify({
        message: text,
        history: state.history.slice(-14),
        layer:   state.currentLayer,
        context: state.context,
      }),
    });
    const data = await res.json();
    typingEl.remove();
    if (!res.ok) throw new Error(data.error || "Server error");

    appendMessage("assistant", data.reply);
    state.history.push({ role: "assistant", text: data.reply });

    if (state.currentLayer === "3" && !state.context.disease) {
      state.context.disease = text.replace(/^proceed with\s*/i, "").trim();
    }
    setStatus("", "Made with ❤️ by Shubh Arya");
  } catch (err) {
    typingEl.remove();
    appendError(err.message);
    setStatus("error", "Error");
  } finally {
    state.isLoading = false; sendBtn.disabled = false;
    chatInput.focus();
  }
}

// ── Render helpers ─────────────────────────────────────────────
function appendMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;
  const now  = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.innerHTML = `<span class="msg-role ${role}">${role === "user" ? "CLINICIAN" : "MEDREF"}</span><span>${now}</span>`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerHTML = role === "assistant" ? renderMarkdown(text) : escapeHtml(text);
  wrap.appendChild(meta); wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function appendTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message assistant typing-indicator";
  wrap.innerHTML = `<div class="message-meta"><span class="msg-role assistant">MEDREF</span></div>
    <div class="message-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  messagesEl.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function appendError(msg) {
  const wrap = document.createElement("div");
  wrap.className = "message assistant";
  const b = document.createElement("div");
  b.className = "message-bubble";
  b.style.cssText = "border-color:rgba(224,83,83,.3);background:rgba(224,83,83,.05);color:#e05353";
  b.textContent = `⚠ ${msg}`;
  wrap.appendChild(b); messagesEl.appendChild(wrap);
  scrollToBottom();
}

function scrollToBottom() { document.getElementById("chat-area").scrollTop = 99999; }
function escapeHtml(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

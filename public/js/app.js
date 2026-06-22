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
  system:       "allopathy",
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
const rogiModal     = document.getElementById("rogi-modal");

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
      setStatus("", "Made with ❤️ Shubh Arya");
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

// Cards config per system
const SYSTEM_CARDS = {
  allopathy: [
    { layer: "1",  icon: "🔬", title: "Differential Diagnosis",    desc: "Patient's age, Gender, Symptoms, Duration, Test results, Allergic To" },
    { layer: "2",  icon: "⚖️", title: "Disease Comparison",        desc: "Compare: eg. \"Compare migraine and headache\" or \"Compare 1 and 3\"" },
    { layer: "3",  icon: "🛡️", title: "Precautions & Management",  desc: "Just type the Disease name eg. \"migraine\" or \"Go with 3\"" },
    { layer: "4",  icon: "💊", title: "Medication Reference",       desc: "Just type the Disease name eg. \"migraine\" or \"Go with 3\"" },
    { layer: "5", icon: "🔎", title: "Medicine Profile",           desc: "Type the medicine name eg. \"ibuprofen\"" },
  ],
  ayurveda: [
    { layer: "1",  icon: "🔬", title: "ROGI PARIKSHĀ & NIDĀNA",    desc: "CLICK THIS CARD to start Ayurvedic diagnosis" },
    { layer: "2",  icon: "🛡️", title: "PATHYA-APATHYA & CHIKITSĀ SŪTRA",  desc: "Ayurvedic management & lifestyle guidance" },
    { layer: "3", icon: "🌿", title: "AUSHADHI CHIKITSĀ",           desc: "Full profile of an Ayurvedic medicine" },
  ],
};

function renderTipCards(system) {
  const container = document.querySelector(".quick-tips");
  container.innerHTML = "";

  SYSTEM_CARDS[system].forEach((card) => {
    const el = document.createElement("div");
    el.className = "tip-card";
    el.dataset.layer = card.layer;
    el.innerHTML = `
      <div class="tip-icon">${card.icon}</div>
      <div class="tip-text"><strong>${card.title}</strong><br/>${card.desc}</div>
    `;
    el.addEventListener("click", () => {
      // Open Rogi form for Ayurveda Layer 1
      if (state.system === "ayurveda" && card.layer === "1") {
        setLayer("1");
        setActiveTipCard("1");
        openRogiForm();
        return;
      }
      setLayer(card.layer);
      setActiveTipCard(card.layer);
      chatInput.focus();
    });
    container.appendChild(el);
  });
}

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
  document.getElementById("new-chat-btn").addEventListener("click", startNewConsult);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);

  // Rogi Pariksha form
  document.getElementById("rogi-modal-close").addEventListener("click", closeRogiForm);
  document.getElementById("rogi-cancel-btn").addEventListener("click",  closeRogiForm);
  document.getElementById("rogi-submit-btn").addEventListener("click",  submitRogiForm);
  rogiModal.addEventListener("click", (e) => {
    if (e.target === rogiModal) closeRogiForm();
  });

  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  // makes every element with the class .layer-item clickable.
  document.querySelectorAll(".layer-item").forEach((item) => {
    item.addEventListener("click", () => setLayer(item.dataset.layer));
  });
  
  // Render default system cards on load
  renderTipCards(state.system);

  // System selector buttons
  document.querySelectorAll(".system-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.system = btn.dataset.system;

      // Toggle active class on buttons
      document.querySelectorAll(".system-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Re-render cards for selected system
      renderTipCards(state.system);

      const allopathyGroup = document.getElementById("allopathy-group");
      const ayurvedaGroup  = document.getElementById("ayurveda-group");

      if (state.system === "allopathy") {
		    allopathyGroup.style.display = "block";
        ayurvedaGroup.style.display  = "none";
        document.getElementById("allopathy-items").style.display = "block";
        document.getElementById("allopathy-arrow").classList.add("open");   
      } else {
		    allopathyGroup.style.display = "none";
        ayurvedaGroup.style.display  = "block";
        document.getElementById("ayurveda-items").style.display = "block";
        document.getElementById("ayurveda-arrow").classList.add("open"); 
      }

      state.history = [];
      state.context = {};
      messagesEl.innerHTML = "";
      welcomeEl.style.display = "flex";
      setLayer("1");
    });
  });

  // Allopathy accordion toggle
  const allopathyHeader = document.getElementById("allopathy-header");
  const allopathyItems  = document.getElementById("allopathy-items");
  const allopathyArrow  = document.getElementById("allopathy-arrow");

  // Expand by default on load
  allopathyItems.style.display = "block";
  allopathyArrow.classList.add("open");

  allopathyHeader.addEventListener("click", () => {
    const isOpen = allopathyItems.style.display !== "none";
    allopathyItems.style.display = isOpen ? "none" : "block";
    allopathyArrow.classList.toggle("open", !isOpen);
  });


  // Ayurveda accordion toggle
  const ayurvedaHeader = document.getElementById("ayurveda-header");
  const ayurvedaItems  = document.getElementById("ayurveda-items");
  const ayurvedaArrow  = document.getElementById("ayurveda-arrow");

  // Expand when clicked
  
  ayurvedaHeader.addEventListener("click", () => {
    const isOpen = ayurvedaItems.style.display !== "none";
    ayurvedaItems.style.display = isOpen ? "none" : "block";
    ayurvedaArrow.classList.toggle("open", !isOpen);
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
    setStatus("", "Made with ❤️ Shubh Arya");
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

// ── Rogi Pariksha Form ─────────────────────────────────────────
function openRogiForm() {
  // Clear all fields
  ["rp-age-gender","rp-vikriti","rp-ahara","rp-vihara","rp-desha","rp-kala"]
    .forEach(id => document.getElementById(id).value = "");
  ["rp-prakriti","rp-agni","rp-koshtha","rp-bala","rp-sattva"]
    .forEach(id => document.getElementById(id).selectedIndex = 0);
  rogiModal.classList.remove("hidden");
}

function closeRogiForm() {
  rogiModal.classList.add("hidden");
}

function submitRogiForm() {
  const get = (id) => document.getElementById(id).value.trim() || "Not specified";

  const formText = `Rogi Parikshā (Patient Intake):
1. Age & Gender: ${get("rp-age-gender")}
2. Prakriti (Constitution): ${get("rp-prakriti")}
3. Vikṛiti (Symptoms): ${get("rp-vikriti")}
4. Āhāra Habits (Diet): ${get("rp-ahara")}
5. Vihāra (Lifestyle): ${get("rp-vihara")}
6. Jatharagni Status: ${get("rp-agni")}
7. Koshtha (Bowel Habits): ${get("rp-koshtha")}
8. Bala (Physical Strength): ${get("rp-bala")}
9. Sattva (Mental Clarity): ${get("rp-sattva")}
10. Desha (Location): ${get("rp-desha")}
11. Kāla (Seasonal Influence): ${get("rp-kala")}

Please perform a complete Rogi Parikshā and Vyādhi Nirṇaya based on the above.`;

  closeRogiForm();

  // Inject into chat input and trigger send
  chatInput.value = formText;
  handleSend();
}


// ── Layer ──────────────────────────────────────────────────────
function setLayer(layer) {
  state.currentLayer = layer;
    const labels = {
    allopathy: {
      "1":  "Allopathy 💊 · Differential Diagnosis",
      "2":  "Allopathy 💊 · Disease Comparison",
      "3":  "Allopathy 💊 · Precautions & Management",
      "4":  "Allopathy 💊 · Medication Reference",
      "5":  "Allopathy 💊 · Medicine Profile",
    },
    ayurveda: {
      "1":  "Ayurveda 🌿 · Rogi Parikshā & Nidāna",
      "2":  "Ayurveda 🌿 · Pathya-Apathya & Chikitsā",
      "3":  "Ayurveda 🌿 · Aushadhi Chikitsā",
      "4":  "Ayurveda 🌿 · RASĀYANA VIJÑĀNA",
    },
  };
  const systemLabels = labels[state.system] || labels["allopathy"];
  layerBadgeEl.textContent = labels[state.system]?.[layer] || labels.allopathy["1"];
  document.querySelectorAll(".layer-item").forEach((el) => el.classList.remove("active"));
  const active = document.querySelector(`.layer-item[data-layer="${layer}"][data-system="${state.system}"]`);
  if (active) active.classList.add("active");
  setActiveTipCard(layer);
}

function setActiveTipCard(layer) {
  document.querySelectorAll(".tip-card").forEach((c) => c.classList.remove("active"));
  const active = document.querySelector(`.tip-card[data-layer="${layer}"]`);
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
  keyBanner.innerHTML = hasKey ? "✓ Secret Code active" : "⚠ Set your Secret Code";
  keyBanner.onclick   = hasKey ? null : openSettings;
}

// ── Send ───────────────────────────────────────────────────────
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text || state.isLoading) return;

  if (!state.groqKey) { openSettings(); return; }

  welcomeEl.style.display = "none";

  const detected = detectLayer(text, state.currentLayer, state.context, state.system);
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
        system:  state.system,
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
    setStatus("", "Made with ❤️ Shubh Arya");
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

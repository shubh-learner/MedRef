# MedRef — AI-Powered Clinical Reference Assistant

> AI-powered secondary reference tool for licensed medical professionals. Powered by Google Gemini (free tier).

---

## 🏥 What it does

MedRef follows a structured 4-layer clinical workflow:

| Layer | Function |
|-------|----------|
| 1 | Symptom intake → Differential diagnosis (3–10 conditions, ranked) |
| 2 | Side-by-side disease comparison |
| 3 | Precautions & management guidelines |
| 4 | Medication reference with severity tiers (🟢 First-line / 🟡 Moderate / 🔴 Severe) |
| 4B | Full clinical drug profile lookup |

---

## 🚀 Setup (completely free)

### 1. Get a free Gemini API Key
Visit [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API key → Copy it.

The **Gemini 2.0 Flash** model is used (free tier, no credit card required).

### 2. Install dependencies
```bash
npm install
```

### 3. Run the server
```bash
npm start
```

Then open: **http://localhost:3000**

### 4. Enter your API key
Click **⚙ Settings** in the sidebar and paste your Gemini API key. It's stored in your browser's `localStorage`.

---

## 🏗️ Project Structure

```
medref/
├── server/
│   ├── index.js          # Express server + API proxy (solves CORS)
│   ├── gemini.js         # Gemini API caller (Node https module)
│   └── promptBuilder.js  # Dynamic system prompt per layer
├── public/
│   ├── index.html        # App shell
│   ├── css/
│   │   └── style.css     # Full UI styles (dark clinical theme)
│   └── js/
│       ├── app.js        # Main frontend logic
│       ├── markdown.js   # Lightweight markdown renderer
│       └── layerDetector.js # Auto-detects active workflow layer
└── package.json
```

---

## 🔒 Why a local server? (CORS solution)

Browser-based apps cannot call the Gemini API directly — browsers block cross-origin requests to `generativelanguage.googleapis.com` unless the server includes CORS headers (which Google's API does not for browser clients).

This project uses a **lightweight Express proxy server** on `localhost:3000`:
- Frontend → `POST /api/chat` (same origin, no CORS issue)
- Server → Gemini API (server-side, no CORS restriction)

This is the standard, correct solution and keeps your API key secure (never exposed in browser network tabs beyond the local request).

---

## 🆓 Free Hosting Options

| Platform | How |
|----------|-----|
| **Railway** | Connect GitHub repo → auto-deploy Node.js → free tier available |
| **Render** | Free web service for Node.js apps |
| **Fly.io** | Free tier with `fly launch` |
| **Glitch** | Paste code → instant deploy |

All these platforms support Node.js apps for free and will serve the frontend + proxy in one deployment.

---

## ⚕️ Disclaimer

This tool is for **licensed medical professionals only** as a secondary cross-check reference. It does not replace clinical examination, diagnostic testing, or professional medical judgment.

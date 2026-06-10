# Firebase Setup Guide for MedRef

This is a one-time setup. Takes ~10 minutes.

---

## Step 1 — Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Enter project name: `medref` (or anything you like)
4. Disable Google Analytics (not needed) → **Create project**

---

## Step 2 — Enable Email/Password Authentication

1. In the Firebase console, click **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Under **"Sign-in method"**, click **"Email/Password"**
4. Toggle **"Enable"** → **Save**

---

## Step 3 — Create Firestore Database

1. Click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"** → Next
4. Select your region (e.g. `asia-south1` for India) → **Enable**

---

## Step 4 — Set Firestore Security Rules

1. In Firestore, click the **"Rules"** tab
2. Replace the default rules with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

3. Click **"Publish"**

This ensures each user can ONLY read/write their own document. Nobody else can see another user's Groq key.

---

## Step 5 — Register a Web App & Get Config

1. In Firebase console, click the **gear icon** → **"Project settings"**
2. Scroll down to **"Your apps"**
3. Click the **"</>"** (Web) icon
4. App nickname: `medref-web` → **Register app**
5. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "medref-xxxxx.firebaseapp.com",
  projectId: "medref-xxxxx",
  storageBucket: "medref-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. Copy this entire config object.

---

## Step 6 — Paste Config into MedRef

Open `public/js/firebase.js` and replace the placeholder config:

```javascript
// Replace this:
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  ...
};

// With your actual config from Step 5.
```

---

## Step 7 — Deploy & Test

```bash
npm install
npm start
```

Open http://localhost:3000
- You'll be redirected to /auth
- Click "Register" → enter name, email, password, and your Groq key
- You're in! Key is saved to Firestore. Never need to enter it again.

---

## Free Tier Limits (Spark Plan — No Credit Card)

| Resource        | Free limit          |
|-----------------|---------------------|
| Auth users      | Unlimited           |
| Firestore reads | 50,000 / day        |
| Firestore writes| 20,000 / day        |
| Storage         | 1 GB                |

More than enough for 10 users storing just an API key each.

# Firebase Authentication Setup Guide

This guide walks you through setting up **Firebase Authentication** for QUALNEX. Firebase Auth is **completely free** for up to 50,000 monthly active users.

---

## 🎯 Why Firebase Auth?

✅ **Free tier** — 50,000 MAU, no credit card required  
✅ **Multiple providers** — Google, GitHub, Email, Phone, Facebook, Twitter  
✅ **Easy integration** — Simple SDK for web, mobile, and backend  
✅ **Secure** — Industry-standard OAuth 2.0 and OpenID Connect  
✅ **Scalable** — Handles millions of users  
✅ **No backend OAuth code** — Firebase handles everything  

---

## 📋 Step 1: Create Firebase Project

### 1.1 Go to Firebase Console

Visit: **https://console.firebase.google.com/**

Sign in with your Google account.

### 1.2 Create New Project

1. Click **"Add project"** or **"Create a project"**
2. Enter project name: `qualnex` (or your preferred name)
3. You can disable Google Analytics (optional)
4. Click **"Create project"**
5. Wait for project to be ready, then click **"Continue"**

---

## 🔐 Step 2: Enable Authentication Providers

### 2.1 Go to Authentication

1. In Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Click the **"Sign-in method"** tab

### 2.2 Enable Google Sign-In

1. Click **"Google"** in the providers list
2. Toggle **"Enable"** to ON
3. Enter a **Project support email** (your email)
4. Click **"Save"**

✅ Google sign-in is now enabled!

### 2.3 Enable GitHub Sign-In

1. Click **"GitHub"** in the providers list
2. Toggle **"Enable"** to ON

**You'll need GitHub OAuth credentials:**

#### Create GitHub OAuth App:

1. Go to: **https://github.com/settings/developers**
2. Click **"New OAuth App"** (or **"OAuth Apps"** tab)
3. Fill in:
   - **Application name**: `QUALNEX`
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: Copy the URL shown in Firebase (looks like `https://your-project.firebaseapp.com/__/auth/handler`)
4. Click **"Register application"**
5. On the next page, click **"Generate a new client secret"**
6. Copy the **Client ID** and **Client Secret**

#### Add to Firebase:

1. Paste the **Client ID** into Firebase
2. Paste the **Client Secret** into Firebase
3. Click **"Save"**

✅ GitHub sign-in is now enabled!

### 2.4 (Optional) Enable Email/Password

1. Click **"Email/Password"** in the providers list
2. Toggle **"Enable"** to ON
3. Click **"Save"**

---

## 🌐 Step 3: Add Web App to Firebase

### 3.1 Register Web App

1. In Firebase Console, click the **⚙️ gear icon** (top left) → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click the **Web icon** (`</>`)
4. Enter app nickname: `QUALNEX Web`
5. **Do NOT** check "Also set up Firebase Hosting" (we'll deploy separately)
6. Click **"Register app"**

### 3.2 Copy Configuration

Firebase will show you a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**Copy all these values!** You'll need them next.

---

## 🔧 Step 4: Configure Frontend

### 4.1 Create `.env` File

In your project root, create a `.env` file:

```bash
cp .env.example .env
```

### 4.2 Add Firebase Config

Open `.env` and add your Firebase values:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000

# Firebase Configuration (from Step 3.2)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

⚠️ **Important**: Replace the placeholder values with your actual Firebase config!

---

## 🔑 Step 5: Configure Backend (Firebase Admin SDK)

The backend needs to verify Firebase tokens. This requires a **Service Account Key**.

### 5.1 Generate Service Account Key

1. Go to Firebase Console → **Project settings** → **Service accounts** tab
2. Click **"Generate new private key"**
3. A JSON file will download (e.g., `qualnex-firebase-adminsdk.json`)
4. **Keep this file secure!** It gives full access to your Firebase project.

### 5.2 Add to Backend Configuration

Open `backend/.env` and add:

```env
# Firebase Authentication
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project
# Path to the service account JSON file you downloaded
FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/qualnex-firebase-adminsdk.json
```

**Option A: Use absolute path**
```env
FIREBASE_SERVICE_ACCOUNT_KEY=/Users/you/projects/qualnex/qualnex-firebase-adminsdk.json
```

**Option B: Place in backend directory**
```bash
# Move the JSON file to backend/
mv ~/Downloads/qualnex-firebase-adminsdk.json backend/

# Update .env
FIREBASE_SERVICE_ACCOUNT_KEY=backend/qualnex-firebase-adminsdk.json
```

⚠️ **Security**: Add the JSON file to `.gitignore`:
```
# .gitignore
*.json
!package.json
backend/qualnex-firebase-adminsdk.json
```

---

## 🚀 Step 6: Test Authentication

### 6.1 Start the Application

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# In another terminal, start frontend
npm run dev
```

### 6.2 Test Login

1. Open http://localhost:5173
2. Click **"Sign In"**
3. Try **"Continue with Google"**
4. You should be redirected to Google, then back to the app
5. Try **"Continue with GitHub"**
6. You should be redirected to GitHub, then back to the app

✅ If both work, Firebase Auth is configured correctly!

---

## 🐛 Troubleshooting

### "auth/operation-not-allowed"

**Problem**: Sign-in method is not enabled in Firebase.

**Solution**: 
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable the provider (Google/GitHub)

### "auth/popup-blocked"

**Problem**: Browser blocked the popup.

**Solution**: 
- Allow popups for localhost in your browser
- Or use redirect mode instead of popup

### "auth/invalid-api-key"

**Problem**: Firebase config is incorrect.

**Solution**: 
- Double-check all values in `.env`
- Make sure there are no extra spaces or quotes

### "auth/domain-not-authorized"

**Problem**: Your domain is not in Firebase's authorized list.

**Solution**: 
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add `localhost` and your production domain

### Backend: "Firebase token verification failed"

**Problem**: Service account key is missing or invalid.

**Solution**: 
- Check `FIREBASE_SERVICE_ACCOUNT_KEY` path in `backend/.env`
- Make sure the JSON file exists and is valid
- Regenerate the key if needed

### GitHub OAuth: "redirect_uri mismatch"

**Problem**: Callback URL doesn't match.

**Solution**: 
- In GitHub OAuth app settings, the callback URL must **exactly** match what Firebase shows
- Firebase callback URL format: `https://your-project.firebaseapp.com/__/auth/handler`

---

## 📊 Firebase Free Tier Limits

| Feature | Free Limit |
|---------|------------|
| Monthly Active Users | 50,000 |
| Email/Password users | Unlimited |
| Phone auth (SMS) | 10 verifications/day |
| Federated identity (Google, GitHub, etc.) | Unlimited |
| Verification emails | Unlimited |
| Password resets | Unlimited |

✅ **For most startups and small businesses, the free tier is more than enough!**

---

## 🔒 Security Best Practices

### 1. Never Commit Service Account Key

Add to `.gitignore`:
```
backend/qualnex-firebase-adminsdk.json
backend/*.json
!package.json
```

### 2. Use Environment Variables

Never hardcode Firebase config in source code. Always use `.env` files.

### 3. Restrict API Key (Optional)

In Firebase Console → Project settings → API keys:
- Click on your API key
- Under "Application restrictions", add your domain
- This prevents others from using your API key

### 4. Enable App Check (Recommended)

Firebase App Check prevents abuse of your backend APIs:
1. Go to Firebase Console → App Check
2. Register your web app
3. Follow the setup guide

### 5. Monitor Authentication Activity

Go to Firebase Console → Authentication → Users to see:
- Total users
- Sign-in providers
- Recent sign-ins

---

## 🎨 Customizing the Login UI

The login page is in `src/pages/Login.tsx`. You can customize:

- **Branding**: Change colors, logo, text
- **Providers**: Add/remove authentication providers
- **Layout**: Adjust spacing, animations
- **Error messages**: Customize error handling

Example: Add email/password login
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';

const handleEmailLogin = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  // ... handle login
};
```

---

## 🚢 Production Deployment

### 1. Update Firebase Authorized Domains

In Firebase Console → Authentication → Settings → Authorized domains:
- Add your production domain (e.g., `app.qualnex.io`)

### 2. Update GitHub OAuth Callback URL

In GitHub Developer Settings → OAuth Apps:
- Update callback URL to: `https://your-project.firebaseapp.com/__/auth/handler`
- (This stays the same, Firebase handles it)

### 3. Update Environment Variables

In your production environment (Vercel, Netlify, etc.):
- Add all `VITE_FIREBASE_*` variables
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` to backend

### 4. Deploy Service Account Key Securely

**Option A: Use environment variable**
```bash
# Convert JSON to base64
base64 -i qualnex-firebase-adminsdk.json

# Set as environment variable
FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=<base64-string>
```

Then in your backend:
```python
import base64
import json

key_json = base64.b64decode(os.environ['FIREBASE_SERVICE_ACCOUNT_KEY_BASE64'])
cred = credentials.Certificate(json.loads(key_json))
```

**Option B: Use cloud secret manager**
- AWS Secrets Manager
- Google Cloud Secret Manager
- Azure Key Vault

---

## 📚 Additional Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

## ✅ Checklist

Before going live:

- [ ] Firebase project created
- [ ] Google sign-in enabled
- [ ] GitHub sign-in enabled
- [ ] Web app registered in Firebase
- [ ] Frontend `.env` configured with Firebase config
- [ ] Backend service account key generated
- [ ] Backend `.env` configured with service account path
- [ ] Service account key added to `.gitignore`
- [ ] Login tested with Google
- [ ] Login tested with GitHub
- [ ] Production domain added to Firebase authorized domains
- [ ] API key restrictions configured (optional)

---

**Need help?** Check the troubleshooting section or open an issue on GitHub.

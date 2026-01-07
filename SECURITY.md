# Security Guide

## ⚠️ API Key Security Warning

If you received a "Publicly Exposed API Key" warning from Google, it is because your `VITE_GEMINI_API_KEY` was detected in the client-side code of your application.

Since this is a client-side application (Vite/React), the API key **MUST** be exposed to the browser to make requests to Gemini. This is normal architecture for serverless apps, but it requires specific security configurations to be safe.

## ✅ Immediate Action Required

### 1. Revoke the Exposed Key
The key that was detected is now compromised. You must revoke it immediately.
1. Go to [Google AI Studio API Keys](https://aistudio.google.com/app/apikey).
2. Find the key matching the warning.
3. Click the trash icon to **Delete** it.

### 2. Generate a Restricted Key
You need a new key that is restricted *only* to your specific websites.
1. Click **Create API Key**.
2. Click on the key to edit its settings (or view in Google Cloud Console).
3. Under **Application restrictions**, select **Websites**.
4. Add the following items to **Website restrictions**:
   - `http://localhost:3000/*` (For local development)
   - `https://your-production-url.com/*` (Add your actual Vercel/Netlify URL here when deployed)
5. Save the changes.

### 3. Update Your Project
1. Open your `.env` (or `.env.local`) file.
2. Replace the old key with your new restricted key:
   ```env
   VITE_GEMINI_API_KEY=your_new_restricted_key_here
   ```
3. Restart your dev server:
   ```bash
   npm run dev
   ```

### 4. Git Hygiene
- Ensure `.env` is listed in your `.gitignore` file (it likely already is).
- **NEVER** commit your `.env` file to GitHub.

# Render Deployment Fix Guide

Your Render deployment is failing with "clean project" error. This usually means Render can't find the necessary files to build and run your Node.js app.

## 🔧 Step-by-Step Fix

### 1. Verify Required Files Exist

Make sure these files are in your backend root directory:

- ✅ `package.json` (already created)
- ✅ `server.js` (already created)
- ✅ `.env` (for local testing)
- ❌ `node_modules/` (should NOT be committed)

### 2. Check package.json Start Script

Your `package.json` should have a start script:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  }
}
```

✅ Already correct in your package.json!

### 3. Configure Environment Variables on Render

In your Render dashboard, go to your web service → Environment and add:

```
# Supabase
SUPABASE_URL=https://vunxmcytadofasyzegoo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Firebase Admin (paste entire JSON on one line)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"joyitchat",...}

# Port (Render sets this automatically, but you can override)
PORT=3000
```

**Important:** For `FIREBASE_SERVICE_ACCOUNT_JSON`, paste the entire JSON content on ONE line (no line breaks).

### 4. Check Build & Start Commands

In Render dashboard, verify:

- **Build Command:** `npm install`
- **Start Command:** `npm start`

These should be auto-detected from your package.json.

### 5. Common Issues & Solutions

#### Issue: "clean project" error
**Cause:** Render can't find package.json or server.js
**Solution:** Make sure files are in the root directory, not in a subfolder

#### Issue: "Module not found" errors
**Cause:** Dependencies not installed
**Solution:** Ensure package.json lists all dependencies and build command is `npm install`

#### Issue: "Cannot find module 'firebase-admin'"
**Cause:** Dependencies missing from package.json
**Solution:** Your package.json already has all required dependencies ✅

#### Issue: Environment variables not working
**Cause:** Variables not set or incorrectly formatted
**Solution:** Double-check variable names and values in Render dashboard

### 6. Test Locally Before Deploying

Before deploying to Render, test locally:

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Supabase and Firebase credentials

# Start server
npm start
```

If it starts successfully on `http://localhost:3000`, it should work on Render.

### 7. Deploy Checklist

- [ ] All files committed to Git (except node_modules, .env)
- [ ] package.json has correct start script
- [ ] Environment variables set on Render
- [ ] Firebase service account JSON is valid (one line)
- [ ] Supabase URL and key are correct
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`

### 8. After Successful Deployment

Once deployed, test your endpoints:

```bash
# Test health (if you add a health endpoint)
curl https://your-app.onrender.com/

# Test upload (with a real Firebase token)
curl -X POST https://your-app.onrender.com/upload \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@test.jpg"
```

## 🚨 If Still Failing

1. **Check Render Logs:**
   - Go to your service → Logs
   - Look for error messages during deployment

2. **Common Log Errors:**
   - "Cannot find module" → Dependencies issue
   - "Error: Firebase credentials not found" → Environment variables not set
   - "Port already in use" → PORT conflict (shouldn't happen on Render)

3. **Share the Logs:**
   - Copy the error logs from Render
   - I can help you interpret them

## 📝 Quick Summary

Your backend code is ready! The deployment issue is likely:
1. Missing files in Git repository
2. Environment variables not configured on Render
3. Build/start commands not set correctly

Follow the steps above and your app should deploy successfully!
# 🚀 Deploying to Render

This guide walks you through deploying the LinkedIn Poster to Render (the easiest cloud platform for Node.js apps).

## Prerequisites

1. **GitHub Account** - Push your code to GitHub first
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier available)
3. **LinkedIn API Credentials** - You'll need these to update your redirect URI

## Step 1: Push to GitHub

If not already done, push your project to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (easiest option)
3. Authorize Render to access your GitHub account

## Step 3: Deploy Backend API

### Option A: Using render.yaml (Automated - Easiest)

1. In Render dashboard, click **"New +"** → **"Blueprint"**
2. Select your GitHub repository
3. Render will auto-detect `render.yaml` and create both services
4. Go to Step 4 for environment variables

### Option B: Manual Setup

1. Click **"New +"** → **"Web Service"**
2. Select your GitHub repository
3. Configure:
   - **Name:** `linkedin-poster-api`
   - **Runtime:** `Node`
   - **Build Command:** `cd mcp-server && npm install`
   - **Start Command:** `cd mcp-server && npm start`
   - **Plan:** Free (or Paid if needed)

4. Click **"Advanced"** and set these environment variables (see Step 4)

## Step 4: Set Environment Variables

After creating the service, go to **Settings** → **Environment** and add:

```
LINKEDIN_CLIENT_ID=your_value_here
LINKEDIN_CLIENT_SECRET=your_value_here
OPENAI_API_KEY=sk-proj-your_value_here
PORT=4000
LINKEDIN_REDIRECT_URI=https://linkedin-poster-api.onrender.com/auth/linkedin/callback
```

**Important:** Replace `linkedin-poster-api` with your actual Render service name.

## Step 5: Update LinkedIn App Settings

Your backend URL will be something like: `https://linkedin-poster-api.onrender.com`

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Edit your app
3. Update **Authorized redirect URLs** to:
   ```
   https://linkedin-poster-api.onrender.com/auth/linkedin/callback
   ```
4. Save

## Step 6: Deploy Frontend

### Using render.yaml (Automated)
- Blueprint will auto-create the static site - skip to verification

### Manual Setup
1. Click **"New +"** → **"Static Site"**
2. Select your GitHub repository
3. Configure:
   - **Name:** `linkedin-poster-web`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

## Step 7: Connect Frontend to Backend

Update your frontend to use the production API URL. Edit the API calls in your React code:

**In `src/App.jsx`**, add at the top:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
```

Then replace all `'http://localhost:4000'` with `API_URL`:

```javascript
// Before:
const res = await fetch('http://localhost:4000/generate', {

// After:
const res = await fetch(`${API_URL}/generate`, {
```

If using render.yaml, `VITE_API_URL` is set automatically to your backend URL.

## Step 8: Verify Deployment

1. **Backend Status:** Check Render dashboard - service should show "Live"
2. **Test API:** Visit `https://linkedin-poster-api.onrender.com/tokens` - should return `{}`
3. **Frontend Status:** Your static site should be live at its URL
4. **Test OAuth:** Click "Connect LinkedIn" button - should redirect to LinkedIn

## Connecting Services

If you deployed manually:

1. In **Frontend** settings → **Environment**, add:
   ```
   VITE_API_URL=https://linkedin-poster-api.onrender.com
   ```

2. Rebuild the frontend (Render will auto-rebuild on push)

## Scaling on Free Tier

**Render's free tier has limitations:**
- Services spin down after 15 minutes of inactivity
- 0.5 CPU, 512MB RAM
- No persistent storage (scheduled posts in memory are lost on restart)

### To upgrade:
1. Click your service in Render dashboard
2. Go to **Settings** → **Plan**
3. Upgrade to Starter/Plus (costs money but includes always-on)

### For persistent storage:
Add a PostgreSQL database to Render and update the backend to store scheduled posts in the database instead of memory.

## Troubleshooting

### Service won't build
- Check **Logs** in Render dashboard
- Ensure `package.json` scripts are correct
- Verify `.env` variables are set

### Frontend can't reach backend
- Check `VITE_API_URL` environment variable
- Verify backend service is running ("Live" status)
- Check CORS settings in `mcp-server/server.js`

### OAuth redirect fails
- Verify `LINKEDIN_REDIRECT_URI` matches exactly in:
  - Backend environment variables
  - LinkedIn app settings
  - Backend code (if hardcoded)

### Scheduled posts disappear on restart
- Free tier spins down the service, clearing in-memory data
- Upgrade to Starter plan or use a database

## Local Development Still Works

Your local setup continues to work:
```bash
npm start
```

Render deployment doesn't affect local development.

## Next Steps

1. ✅ Push to GitHub
2. ✅ Create Render account
3. ✅ Deploy using render.yaml or manually
4. ✅ Set environment variables
5. ✅ Update LinkedIn redirect URI
6. ✅ Update frontend API URL
7. ✅ Test in production

Your app is now live in the cloud! 🎉

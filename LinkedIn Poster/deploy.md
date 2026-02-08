# Deployment Guide - LinkedIn Poster

## Quick Deploy to Render

### Option 1: Automatic Deployment (GitHub Connected)
When you push commits to GitHub's main branch, Render automatically redeploys. Just do:

```bash
git push
```

Then wait 2-3 minutes for Render to detect the change and rebuild.

### Option 2: Manual Deployment (Recommended)
If automatic deployment isn't triggering:

1. **Visit Render Dashboard**
   - Go to: https://dashboard.render.com
   - Find service: `linkedin-poster-api`

2. **Manual Deploy Steps**
   - Click on the `linkedin-poster-api` service
   - Click the "Deploy latest commit" button (top right)
   - Watch the build logs in real-time
   - Wait for status to change from "Building" → "Live" (usually 3-5 minutes)

3. **Verify Deployment**
   - Visit: https://linkedin-sinj.onrender.com
   - Should see LinkedIn Poster UI load
   - Check browser console for any errors

### Option 3: Using Render CLI (Advanced)

If you have the Render CLI installed:

```bash
render deploy --service linkedin-poster-api
```

## Deployment Environment Variables

Make sure these are set in Render dashboard (`linkedin-poster-api` service settings):

**Required (no defaults):**
- `LINKEDIN_CLIENT_ID` - LinkedIn app client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn app secret
- `OPENAI_API_KEY` - OpenAI API key (GPT-4 + DALL-E-3)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key (⚠️ NOT publishable key)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather

**Pre-configured:**
- `PORT=4000`
- `LINKEDIN_REDIRECT_URI=https://linkedin-sinj.onrender.com/auth/linkedin/callback`
- `RENDER_API_URL=https://linkedin-sinj.onrender.com`
- `VITE_API_URL=https://linkedin-sinj.onrender.com`

## Troubleshooting Deployments

### Deploy Status Shows "Build Failed"

1. **Check build logs:**
   - Click service → "Logs" tab
   - Look for error messages

2. **Common causes:**
   - Missing environment variables - add them in service settings
   - Wrong SUPABASE_KEY - must be ANON key, not publishable
   - API key invalid - verify OpenAI key is active
   - Git hasn't synced - wait a few minutes and manually deploy

3. **Fix and redeploy:**
   ```bash
   # Fix issues locally
   git add .
   git commit -m "Fix deployment issue"
   git push
   # Then manually deploy from Render dashboard
   ```

### Frontend Shows "Cannot GET /"

- Wait for build to complete (status = "Live")
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Check service status - should say "Live", not "Building"

### Telegram Bot Not Responding

- Verify `TELEGRAM_BOT_TOKEN` is set in Render dashboard
- Check logs for: "✅ Telegram bot initialized"
- If missing, token expired - get new one from @BotFather
- Set it in Render dashboard and redeploy

### LinkedIn OAuth Failing

- Verify `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set
- Check LinkedIn Developer App settings has correct redirect URI:
  - Should be: `https://linkedin-sinj.onrender.com/auth/linkedin/callback`
- Redeploy if you just added/changed these variables

## Build Command Reference

The Render build command (from render.yaml):
```
npm install && npm run build && cd mcp-server && npm install
```

This:
1. Installs frontend dependencies
2. Builds React frontend to `dist/` folder
3. Installs backend dependencies
4. Backend (server.js) serves the dist folder at startup

## Deployment Architecture

```
GitHub Push
    ↓
Render detects new commit (or manual deploy triggered)
    ↓
Build Phase:
  - npm install (frontend deps)
  - npm run build (React → dist/)
  - cd mcp-server && npm install (backend deps)
    ↓
Start Phase:
  - cd mcp-server && npm start
  - Backend loads Supabase tokens
  - Backend initializes Telegram bot
  - Backend serves dist/ at root path (/)
    ↓
Service Live at: https://linkedin-sinj.onrender.com
```

## Checking Deployment Status

**Current service URL:** https://linkedin-sinj.onrender.com

To check if it's working:
```bash
# Should return HTML (frontend)
curl https://linkedin-sinj.onrender.com/

# Should return JSON (API)
curl https://linkedin-sinj.onrender.com/health || \
curl https://linkedin-poster-api.onrender.com/generate -X POST \
  -H "Content-Type: application/json" \
  -d '{"topic":"test"}'
```

## When to Deploy

- After code changes (auto-deploys when you push)
- After environment variable changes (manual deploy needed)
- After updating Telegram bot token (manual deploy)
- After LinkedIn app credential changes (manual deploy)

## Still Having Issues?

1. Check Render service logs: https://dashboard.render.com → linkedin-poster-api → Logs
2. Verify all environment variables are set
3. Try manual deploy from dashboard ("Deploy latest commit" button)
4. Check that git push succeeded: `git log --oneline` shows latest commits
5. Wait 5+ minutes - Render caching sometimes causes delays

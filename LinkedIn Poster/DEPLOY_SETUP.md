# Automated Deployment Setup

This guide walks you through setting up automated deployments for LinkedIn Poster.

## Quick Start (Simplest Option)

Use the local deploy script:

```bash
./scripts/deploy.sh
```

This script will:
1. Check for uncommitted changes
2. Commit and push to GitHub (with your message)
3. Show you deployment status options
4. Display real-time build status links

---

## Option 1: GitHub Actions + Render Webhook (Recommended)

Automatically deploys to Render whenever you push to GitHub's main branch.

### Setup Steps

#### Step 1: Get Render Deploy Key

1. Go to: https://dashboard.render.com
2. Find service: `linkedin-poster-api`
3. Click **Settings** (top right)
4. Scroll to **Deploy Hook**
5. Copy the full URL - it looks like:
   ```
   https://api.render.com/deploy/srv-xxxxx?key=xxxxx
   ```

#### Step 2: Extract Render Secrets

From the URL above, extract:
- **RENDER_SERVICE_ID**: the `srv-xxxxx` part
- **RENDER_DEPLOY_KEY**: the `key=xxxxx` part

#### Step 3: Add GitHub Secrets

1. Go to: https://github.com/RorieDev/linkedin/settings/secrets/actions
2. Click **New repository secret**
3. Add these secrets:

   **Secret 1:**
   - Name: `RENDER_SERVICE_ID`
   - Value: `srv-xxxxx` (from Step 1)
   - Click **Add secret**

   **Secret 2:**
   - Name: `RENDER_DEPLOY_KEY`
   - Value: `xxxxx` (just the key part, not the full URL)
   - Click **Add secret**

#### Step 4: Test It

```bash
git add -A
git commit -m "Test automated deployment"
git push
```

Then check:
- GitHub Actions: https://github.com/RorieDev/linkedin/actions
- Render Dashboard: https://dashboard.render.com

You should see the deployment automatically trigger!

---

## Option 2: Local Deploy Script

For quick manual deployments without setting up GitHub Actions.

### Usage

```bash
# Simple push and deploy
./scripts/deploy.sh

# Or manually
git push
# Then deploy via Render dashboard or Render CLI
```

The script:
- ✅ Checks for uncommitted changes
- ✅ Prompts to commit with proper format
- ✅ Pushes to GitHub
- ✅ Shows all deployment options
- ✅ Displays build status links
- ✅ Integrates with GitHub CLI (if installed)

### Requirements

- Git configured
- GitHub CLI (optional, for real-time status)

Install GitHub CLI:
```bash
brew install gh
```

---

## Option 3: Render CLI

Direct deployment without GitHub.

### Setup

```bash
# Install Render CLI (if not already installed)
npm install -g render-cli

# Login to Render
render login

# Deploy
render deploy --service linkedin-poster-api
```

### Benefits
- ✅ Instant deployment
- ✅ No GitHub required
- ✅ Real-time build logs

---

## Troubleshooting

### GitHub Actions Status

Check workflow runs at: https://github.com/RorieDev/linkedin/actions

Look for:
- ✅ **Success** - Deployment triggered, check Render dashboard
- ❌ **Failed** - Check the error message, likely bad Render secret

### Render Deployment Failed

Check logs at: https://dashboard.render.com → linkedin-poster-api → Logs

Common issues:
1. **Build failed** - Check environment variables are set
2. **Port not binding** - Server crashed, check logs
3. **Missing dependencies** - npm install failed
4. **Supabase connection** - Check SUPABASE_URL and SUPABASE_KEY

### Deploy Key Expired

If GitHub Actions fails with auth errors:
1. Go back to Render Dashboard
2. Get a fresh Deploy Hook URL
3. Update GitHub secrets with new values

---

## Using with Deploy Guide

For complete deployment documentation, see [deploy.md](deploy.md):

- Manual Render deployment
- Environment variable reference
- Troubleshooting guide
- Build command explanation

---

## Summary

| Method | Speed | Automatic | Complexity |
|--------|-------|-----------|-----------|
| `./scripts/deploy.sh` | ⚡ Fast | ❌ Manual | ✅ Simple |
| GitHub Actions | ⚡ Fast | ✅ On push | 🟡 Medium |
| Render CLI | ⚡ Fast | ❌ Manual | 🟡 Medium |
| Render Dashboard | 🐢 Slow | ❌ Manual | ✅ Simple |

**Recommended Setup:**
1. Use `./scripts/deploy.sh` for quick deployments
2. Optionally set up GitHub Actions for automatic deploys on push
3. Keep [deploy.md](deploy.md) handy for troubleshooting

---

## Next Steps

1. **Quick**: Just use `./scripts/deploy.sh` to start deploying
2. **Automated**: Follow GitHub Actions setup for auto-deployments
3. **Reference**: See [deploy.md](deploy.md) for detailed troubleshooting

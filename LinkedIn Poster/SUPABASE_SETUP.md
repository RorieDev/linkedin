# 🗄️ Supabase Setup Guide

This guide walks you through setting up Supabase for persistent data storage. With Supabase, your LinkedIn tokens and scheduled posts will survive server restarts.

## Why Supabase?

✅ **Free tier** - Includes PostgreSQL database
✅ **Persistent storage** - Data survives server restarts
✅ **Works on Render** - Unlike file-based storage (ephemeral)
✅ **Scalable** - Handles growth easily
✅ **Simple to set up** - Just SQL and environment variables

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub (or email)
3. Click **"New Project"**
4. Choose:
   - **Name**: `linkedin-poster` (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Pick closest to you
5. Wait for project to spin up (~2 min)

## Step 2: Create Database Tables

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New Query"**
3. Copy the SQL from [mcp-server/supabase.sql](./mcp-server/supabase.sql)
4. Paste it into the query editor
5. Click **"Run"** (execute the query)
6. Confirm you see the tables created (✓)

## Step 3: Get API Credentials

1. Click **"Project Settings"** (left sidebar) → **"API"**
2. Copy these values:
   - **Project URL** → Use as `SUPABASE_URL`
   - **Anon public key** → Use as `SUPABASE_KEY`

Example:
```
SUPABASE_URL=https://abc123xyz.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Local Development

### Update `.env` file

Edit `mcp-server/.env`:

```env
# ... existing env vars ...

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```

### Test locally

1. Restart backend: `npm run stop && npm start`
2. Connect LinkedIn (token saves to Supabase)
3. Schedule a post
4. Check Supabase dashboard → **"Table Editor"** → `scheduled_posts`
   - You should see your post!

4. Stop backend and restart
   - Your post should still be there!
   - Token should still be stored!

## Step 5: Production Deployment (Render)

### Update render.yaml

```yaml
services:
  - type: web
    name: linkedin-poster-api
    # ... other config ...
    envVars:
      - key: SUPABASE_URL
        value: your-url-here  # Or sync from Render secret
      - key: SUPABASE_KEY
        value: your-key-here  # Or sync from Render secret
      # ... other env vars ...
```

### Set Environment Variables in Render

1. Go to your Render service dashboard
2. Click **"Environment"** tab
3. Add:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-public-key
   ```
4. Click **"Save"** (service will restart)

## Step 6: Test in Production

1. Your backend on Render is now connected to Supabase
2. Connect LinkedIn → token saved to Supabase ✓
3. Schedule a post → saved to Supabase ✓
4. If Render spins down → data survives! ✓

## Supabase Dashboard

Once set up, you can monitor everything:

- **Table Editor** - View/edit tokens and scheduled posts
- **Logs** - See query activity
- **Backups** - Automated daily backups
- **RLS Policies** - Fine-tune security (optional)

## Troubleshooting

### "No token for this memberId"

**Problem:** Scheduled post fails to publish
**Solution:** Check if token exists in Supabase `tokens` table with correct `member_id`

### "Connection refused"

**Problem:** Can't connect to Supabase
**Solution:** Check SUPABASE_URL and SUPABASE_KEY are correct

### "Error: no such table"

**Problem:** Tables don't exist
**Solution:** Run the SQL setup again (Step 2)

### Data lost on Render

**Problem:** Scheduled posts disappeared
**Solution:** This shouldn't happen with Supabase! Check:
- SUPABASE_URL and SUPABASE_KEY in Render env vars
- Tables exist in Supabase dashboard
- No RLS policies blocking writes

## Going from File-Based to Supabase

If you were using file-based storage before:

1. Tokens and scheduled posts from files won't migrate automatically
2. Set up Supabase fresh (empty tables)
3. Reconnect LinkedIn (creates new token in Supabase)
4. Schedule new posts (they'll be in Supabase)
5. Old file-based data can be safely ignored

## Scaling Up

**Current setup (free tier):**
- ✅ Perfect for personal use
- ✅ Handles thousands of scheduled posts
- ✅ 500MB database storage
- ✅ Unlimited API requests

**When to upgrade:**
- Using > 500MB storage (unlikely)
- Need more than 2 concurrent connections
- Want priority support

## Security Notes

Current setup uses **public access** (anyone can read/write). For production:

1. Add Postgres Role-Based Access Control (RBAC)
2. Implement authentication
3. Restrict RLS policies

For now, keep it public since it's your own app.

## Next Steps

1. ✅ Create Supabase project
2. ✅ Run SQL setup
3. ✅ Get API credentials
4. ✅ Update `.env` (local)
5. ✅ Test locally
6. ✅ Update Render env vars
7. ✅ Test in production
8. ✅ Monitor in Supabase dashboard

You're now using persistent database storage! 🎉

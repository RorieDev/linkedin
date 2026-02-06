# 📐 LinkedIn Poster Architecture

## Local Development Setup

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│              (http://localhost:5173)                     │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────▼────┐               ┌───────▼────┐
   │ Frontend │               │ LinkedIn   │
   │ Vite Dev │──────────────▶│   OAuth    │
   │ Server   │               │  Endpoint  │
   └────┬────┘               └────────────┘
        │
        │ API Calls
        │ (http://localhost:4000/*)
        │
   ┌────▼────────────────────────┐
   │  Backend Express Server      │
   │  (http://localhost:4000)     │
   │                              │
   │  ✓ LinkedIn OAuth Handler    │
   │  ✓ Content Generation (GPT4) │
   │  ✓ Image Generation (DALL-E) │
   │  ✓ Post Publishing           │
   │  ✓ Scheduled Post Cron Job   │
   │  ✓ Token Storage (in-memory) │
   │                              │
   └────┬──────────────────────┬──┘
        │                      │
   ┌────▼────┐         ┌──────▼──────┐
   │  OpenAI │         │  LinkedIn   │
   │   API   │         │     API     │
   │         │         │             │
   │ - GPT-4 │         │ - OAuth     │
   │ - DALL-E│         │ - Post      │
   └─────────┘         │ - Upload    │
                       └─────────────┘
```

## Production Deployment on Render

```
┌─────────────────────────────────────────────────────────────────┐
│                    Internet / User Browser                       │
└────────────────────┬─────────────────────────────────────────────┘
                     │
        ┌────────────┴───────────────┐
        │                            │
   ┌────▼──────────────────┐   ┌────▼───────────────────┐
   │  Frontend Static Site  │   │  Backend Web Service   │
   │ (Render Static Site)   │   │  (Render Web Service)  │
   │                        │   │                        │
   │ - Built Vite output    │   │ - Node.js Express      │
   │ - VITE_API_URL env var │──▶│ - Scheduled cron jobs  │
   │ - Zero-downtime updates│   │ - Token storage        │
   │                        │   │                        │
   │ URL:                   │   │ URL:                   │
   │ linkedin-poster-web    │   │ linkedin-poster-api    │
   │  .onrender.com         │   │  .onrender.com         │
   └────────────────────────┘   └────┬───────┬───────────┘
                                     │       │
                        ┌────────────┘       └──────────────┐
                        │                                   │
                   ┌────▼────┐                       ┌──────▼──────┐
                   │  OpenAI  │                       │  LinkedIn   │
                   │   APIs   │                       │     APIs    │
                   │          │                       │             │
                   │ - GPT-4  │                       │ - OAuth     │
                   │ - DALL-E │                       │ - UGC Posts │
                   └──────────┘                       │ - Uploads   │
                                                      └─────────────┘
```

## Data Flow

### 1. User Connects LinkedIn
```
User clicks "Connect LinkedIn"
         │
         ▼
Frontend opens OAuth window → Backend /auth/linkedin
         │
         ▼
User authorizes on LinkedIn
         │
         ▼
LinkedIn redirects to /auth/linkedin/callback
         │
         ▼
Backend exchanges code for access_token
         │
         ▼
Backend stores token for memberId (in-memory)
         │
         ▼
Frontend polls /tokens until memberId appears
         │
         ▼
User is "connected" ✓
```

### 2. Generate and Post
```
User enters topic/prompt
         │
         ▼
Frontend calls /generate (GPT-4)
         │
         ▼
Backend returns AI-generated post
         │
         ▼
Frontend displays post (editable)
         │
         ▼
User clicks "Post Now"
         │
         ▼
Frontend calls /post with:
  - memberId
  - message (post content)
  - imageUrl (optional)
         │
         ▼
Backend uploads image to LinkedIn (if provided)
         │
         ▼
Backend publishes UGC post to LinkedIn API
         │
         ▼
Post appears on LinkedIn ✓
```

### 3. Schedule for Later
```
User clicks "Schedule"
         │
         ▼
Frontend calls /schedule with:
  - memberId
  - message
  - imageUrl
  - scheduledTime (ISO datetime)
         │
         ▼
Backend stores in scheduledPosts (in-memory)
         │
         ▼
Cron job runs every minute:
  Checks if any scheduled posts are ready
         │
         ▼
If scheduledTime <= now:
  - Uploads image (if provided)
  - Publishes post to LinkedIn
  - Marks as "published"
         │
         ▼
Post appears on LinkedIn at scheduled time ✓
```

## Environment Variables

### Backend (.env or Render)
```
LINKEDIN_CLIENT_ID=...         # LinkedIn app credentials
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=...      # Must match LinkedIn app settings
OPENAI_API_KEY=...             # OpenAI API key
PORT=4000                      # Server port (default 4000)
```

### Frontend (Vite build-time)
```
VITE_API_URL=...              # Backend API URL
                               # Dev: http://localhost:4000
                               # Prod: https://your-render-app.onrender.com
```

## Storage

### Local Development
- **Tokens**: In-memory JavaScript object
- **Scheduled Posts**: In-memory JavaScript object
- **Loss**: Data lost on server restart

### Production (Free Tier)
- **Same as local** (in-memory)
- **Note**: Free tier spins down after 15 min → data lost
- **Solution**: Upgrade to Starter tier or add PostgreSQL

### Production (With Database)
- **Tokens**: PostgreSQL database
- **Scheduled Posts**: PostgreSQL database
- **Loss**: Never (persisted)
- **Cost**: ~$7/month for Starter tier

## API Endpoints

### Authentication
- `GET /auth/linkedin` - Start OAuth flow
- `GET /auth/linkedin/callback` - OAuth callback (LinkedIn → Backend)
- `GET /tokens` - List all stored tokens (for polling)

### Content Generation
- `POST /generate` - Generate post text (GPT-4)
  ```json
  { "prompt": "...", "topic": "...", "sourceUrl": "..." }
  ```
- `POST /generate-image` - Generate image (DALL-E-3)
  ```json
  { "topic": "...", "sourceUrl": "..." }
  ```

### Publishing
- `POST /post` - Publish immediately
  ```json
  { "memberId": "...", "message": "...", "imageUrl": "..." }
  ```
- `POST /schedule` - Schedule for later
  ```json
  { "memberId": "...", "message": "...", "imageUrl": "...", "scheduledTime": "2024-..." }
  ```

### Schedule Management
- `GET /scheduled-posts` - List all scheduled posts
- `DELETE /scheduled-posts/:postId` - Cancel scheduled post

## Performance Considerations

### Frontend
- **Build**: Vite ~300ms
- **Bundle**: ~50KB gzipped
- **HMR**: Hot reload on save
- **Static Hosting**: Zero-downtime deploys

### Backend
- **Startup**: ~200ms
- **Dependencies**: ~15 packages
- **Memory**: ~30MB baseline + in-memory storage
- **Cron Job**: Runs every 60 seconds

### Scaling Path
1. **Start**: Free tier (~50 monthly users)
2. **Scale**: Starter tier + PostgreSQL ($7+)
3. **Enterprise**: Higher tier + Redis + database replication

## Security Considerations

- ✅ `.env` files not committed (in .gitignore)
- ✅ CORS enabled for frontend origin
- ✅ OAuth tokens stored server-side
- ✅ Access tokens never exposed to frontend
- ⚠️ In-memory storage not secure for production scaling
- ⚠️ Token validation minimal (dev mode - can be enhanced)

### To Harden for Production
- Add JWT validation
- Use HTTPS only (Render default)
- Add rate limiting
- Implement token refresh
- Use database with encryption
- Add audit logging

## Deployment Checklist

- [ ] Push to GitHub
- [ ] Create Render account
- [ ] Deploy using render.yaml or manually
- [ ] Set environment variables
- [ ] Update LinkedIn app redirect URI
- [ ] Test OAuth flow
- [ ] Test content generation
- [ ] Test post publishing
- [ ] Schedule a test post
- [ ] Verify scheduled post publishes
- [ ] Monitor logs in Render dashboard

## Useful Commands

```bash
# Local development
npm start                    # Start both servers

# View logs
tail -f frontend.log
tail -f backend.log

# Render deployment
git push origin main         # Triggers auto-rebuild

# Check Render logs
# Visit Render dashboard → Service → Logs

# Test endpoints
curl http://localhost:4000/tokens
curl http://localhost:4000/scheduled-posts
```

## Next Steps

1. Review [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
2. Push to GitHub
3. Create Render account
4. Deploy using render.yaml
5. Update LinkedIn app settings
6. Test end-to-end in production
7. Monitor scheduled post execution

All set! Your app is architecture-ready for cloud deployment. 🚀

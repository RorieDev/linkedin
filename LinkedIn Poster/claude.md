# LinkedIn Poster - Project Documentation

## Overview
LinkedIn Poster is an AI-powered application that generates and publishes LinkedIn posts with optional images. It uses OpenAI's GPT-4 for text generation and DALL-E-3 for image creation.

## Project Structure
```
├── src/
│   ├── App.jsx              # Main React component
│   ├── main.jsx             # Entry point
│   └── index.css             # Global styles
├── mcp-server/
│   ├── server.js            # Express backend server
│   ├── package.json         # Backend dependencies
│   └── .env                 # Environment variables (API keys)
├── public/
├── package.json             # Frontend dependencies
└── vite.config.js          # Vite configuration
```

## Stack
- **Frontend**: React 19, Vite, Framer Motion, Lucide icons
- **Backend**: Express.js, node-cron, OpenAI API, node-telegram-bot-api
- **Authentication**: LinkedIn OAuth 2.0 with OpenID Connect
- **Storage**: Supabase (PostgreSQL) + optional in-memory fallback
- **Deployment**: Render
- **Bot Interface**: Telegram Bot API

## Key Features
1. **AI Content Generation** - GPT-4 generates posts with sarcastic wit
2. **Image Generation** - DALL-E-3 creates images for every post
3. **Telegram Bot** - Post generation via Telegram `/connect` → send topics/URLs
4. **LinkedIn Publishing** - Real OAuth integration for actual posting
5. **Post Scheduling** - Schedule posts with cron-based automation
6. **URL-based Generation** - Paste article URLs and AI writes about them
7. **Confirmation Workflow** - Review posts before publishing (Yes/No buttons)
8. **Persistent Storage** - Supabase stores tokens and scheduled posts

## Voice Guidelines
Posts are generated with:
- **Tone**: Sarcastic, British wit, dark humour
- **Length**: One paragraph max (150 words)
- **Style**: Punches corporate nonsense, genuine observations
- **Emojis**: Only 🚨 at start and end
- **Language**: British English (colour, organisation, realise, etc.)
- **No engagement tactics**: No "What do you think?" or CTAs
- **Roasts**: Absolutely dismisses buzzwords like "synergy" and "hustle culture"

Example topics it handles well:
- "Why remote work is exhausting"
- "The synergy craze is getting ridiculous"
- "Why hustle culture is a lie"
- Article URLs about workplace trends

## System Prompt
Located in:
- `mcp-server/server.js` - Web UI generation
- `mcp-server/telegram-bot.js` (lines 106-132) - Telegram bot generation

Both enforce sarcastic tone with dark humour, 150-word max, and 🚨 bookends.

## Getting Started

### Prerequisites
- Node.js 18+
- OpenAI API key
- LinkedIn OAuth app credentials

### Environment Setup
Create `mcp-server/.env`:
```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:4000/auth/linkedin/callback
OPENAI_API_KEY=your_openai_key
PORT=4000
```

### Start Both Servers
```bash
npm run start-all
```

Or manually:
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd mcp-server && npm start
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:4000`

## API Endpoints

### Text Generation
**POST** `/generate`
```json
{
  "prompt": "optional custom prompt",
  "topic": "what to write about",
  "sourceUrl": "optional URL context"
}
```

### Image Generation
**POST** `/generate-image`
```json
{
  "topic": "what image should show",
  "sourceUrl": "optional context"
}
```

### Publishing
**POST** `/post`
```json
{
  "memberId": "user's LinkedIn ID",
  "message": "post content",
  "imageUrl": "optional image URL"
}
```

### Scheduling
**POST** `/schedule`
```json
{
  "memberId": "user's LinkedIn ID",
  "message": "post content",
  "imageUrl": "optional image URL",
  "scheduledTime": "2026-02-10T15:00:00Z"
}
```

**GET** `/scheduled-posts` - List all scheduled posts
**DELETE** `/scheduled-posts/:postId` - Cancel a scheduled post

## Telegram Bot

The bot (@RorieDev_linkedinposting_bot) enables instant post generation via Telegram.

### Commands
- `/start` - Welcome message
- `/connect` - Link your LinkedIn account via OAuth
- `/status` - Check if LinkedIn is connected
- `/disconnect` - Unlink LinkedIn account
- `/help` - Show all commands

### Workflow
1. User sends `/connect` → Gets LinkedIn OAuth link
2. User clicks link → Authorizes on LinkedIn
3. OAuth callback stores Telegram ID → LinkedIn member mapping in Supabase
4. User sends a topic or article URL
5. Bot generates post + image
6. Bot shows preview with Yes/No buttons
7. User clicks Yes → Post publishes to LinkedIn
8. User gets confirmation message

### Features
- **Topic-based**: Send `"Why AI is overrated"` → AI generates post
- **URL-based**: Paste `https://example.com/article` → AI reads & generates post
- **Auto-images**: Every post gets a DALL-E-3 generated image
- **Confirmation**: Review before publishing (no accidental posts!)
- **Error handling**: Clear messages if LinkedIn connection expired
- **Data persistence**: All user data stored in Supabase

### Files
- `mcp-server/telegram-bot.js` - Bot logic and command handlers
- `mcp-server/server.js` - OAuth callback for Telegram linking
- Database table: `telegram_users` - Maps Telegram ID to LinkedIn member ID

## Recent Changes

### Telegram Bot Integration
- Added Telegram bot with `/connect`, `/status`, `/disconnect`, `/help` commands
- URL-based post generation (paste article links)
- Post confirmation workflow with Yes/No buttons
- Automatic image generation with every post
- Sarcastic AI voice with dark humour

### Sarcasm & Brevity Update
- Reduced post length: 1 paragraph max (150 words)
- Added British sarcasm and dark humour tone
- Posts roast corporate nonsense (synergy, hustle culture, etc.)
- Removed motivational language entirely
- Temperature set to 0.5 for focused, punchy content

### Render Deployment
- Successfully deployed to Render: https://linkedin-sinj.onrender.com
- Supabase for persistent token and post storage
- Build command: `cd "LinkedIn Poster/mcp-server" && npm install`
- Start command: `cd "LinkedIn Poster/mcp-server" && npm start`

### Paragraph Limit
Posts are now limited to maximum 2-3 paragraphs for conciseness.

### Image Generation Workflow
- Images no longer auto-generate with text
- Click "Generate Image" button when happy with post text
- Click again to generate different images
- Saves API credits by only generating images you'll use

### Voice Updates
- Added 🚨 emoji bookends to all posts
- Enforced strict British English
- Temperature reduced to 0.5 for focused content
- Added critical instruction to use user input (fixes ignoring prompts)

## Development Notes

### Hot Reload
- Frontend: Vite HMR automatically refreshes on code changes
- Backend: Uses nodemon for auto-restart (configure in mcp-server/package.json)

### State Management
- Frontend: React hooks (useState)
- Backend: Supabase (PostgreSQL) for tokens, scheduled_posts, telegram_users
- Fallback: In-memory if Supabase not configured
- Persistent across server restarts

### Scheduling
- Cron job runs every minute (`* * * * *`)
- Checks scheduledPosts for due posts
- Automatically publishes when time is reached
- Updates status: scheduled → publishing → published/failed

## Common Issues

**Post generation ignores my input**
- Ensure backend is running latest version
- Check system prompt has CRITICAL instruction to use exact user input
- Temperature is 0.5 for focused content

**Image won't generate**
- Verify OPENAI_API_KEY is valid
- Check OpenAI account has DALL-E-3 access
- Ensure topic is descriptive enough (min 5 chars)

**LinkedIn posting fails**
- Confirm OAuth credentials are correct
- Check memberID is valid
- Verify token hasn't expired
- Run `/status` in Telegram to check connection

**Telegram bot not responding**
- Make sure TELEGRAM_BOT_TOKEN is set in .env
- Check backend is running: see logs for "✅ Telegram bot initialized"
- Verify no other bot instance is running (causes 409 Conflict error)
- Ensure Supabase is configured for persistent storage

**Can't connect LinkedIn via Telegram**
- Make sure LinkedIn app has correct redirect URI in developer settings
- Check LINKEDIN_REDIRECT_URI in .env matches LinkedIn app config
- For Telegram: `https://your-render-url/auth/linkedin/callback`

**Scheduled posts not publishing**
- Check server logs for cron job execution
- Ensure scheduledTime is in future
- Verify token exists for memberId in Supabase

**Supabase connection fails**
- Check SUPABASE_URL and SUPABASE_KEY are correct
- Make sure you're using ANON key, not publishable key
- Verify RLS policies allow anonymous access
- Check database tables exist: tokens, scheduled_posts, telegram_users

## Future Improvements
- Persistent database for posts/tokens
- User authentication system
- Multiple account support
- Post analytics/performance tracking
- Content templates
- Hashtag optimization
- Multi-language support

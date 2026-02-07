# 🚨 LinkedIn Poster

An AI-powered tool to generate and publish LinkedIn posts with sarcastic wit and sharp observations. Generate posts from topics or articles, then publish directly to LinkedIn with auto-generated images.

## Features

✨ **Smart Content Generation**
- AI-written posts with British wit and dark humour
- Generate from topics or article URLs
- Automatic DALL-E-3 image generation
- Post confirmation before publishing
- Sarcastic, punchy tone (no corporate BS)

🤖 **Telegram Bot Interface**
- Send topics or article URLs via Telegram
- `/connect` to link LinkedIn
- `/status` to check connection
- `/disconnect` to unlink
- Instant post generation and publishing

🚀 **Production Ready**
- Deployed on Render
- Persistent storage with Supabase
- Real OAuth integration with LinkedIn
- Scheduled post support
- WebUI for manual posting

## Quick Start

### Prerequisites
- Node.js 18+
- LinkedIn Developer App credentials
- OpenAI API key
- Supabase project
- Telegram Bot token (@BotFather)

### Setup

1. **Clone & Install**
```bash
git clone https://github.com/RorieDev/linkedin.git
cd LinkedIn\ Poster
npm install
cd mcp-server && npm install && cd ..
```

2. **Configure Environment** (`mcp-server/.env`)
```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:4000/auth/linkedin/callback
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
PORT=4000
RENDER_API_URL=http://localhost:4000
```

3. **Start Servers**
```bash
npm run start-all
# Frontend: http://localhost:5173
# Backend: http://localhost:4000
```

## Usage

### Telegram Bot
Find **@RorieDev_linkedinposting_bot** on Telegram

**Connect your LinkedIn:**
```
/connect → Click OAuth link → Authorize
```

**Generate & post:**
```
Send a topic: "Why remote work is exhausting"
OR paste a URL: https://example.com/article

Review generated post → Click Yes/No button → Done!
```

### Web UI
Visit http://localhost:5173
- Connect LinkedIn via OAuth
- Generate posts with custom prompts
- View post history
- Schedule posts for later

## API Endpoints

### Text Generation
`POST /generate`
```json
{
  "topic": "AI hype vs reality",
  "sourceUrl": "optional article URL"
}
```

### Image Generation
`POST /generate-image`
```json
{
  "topic": "AI hype vs reality"
}
```

### Publishing
`POST /post`
```json
{
  "memberId": "user_id",
  "message": "post content",
  "imageUrl": "optional image url"
}
```

### Scheduling
`POST /schedule`
```json
{
  "memberId": "user_id",
  "message": "post content",
  "imageUrl": "optional image url",
  "scheduledTime": "2026-02-10T15:00:00Z"
}
```

## AI Voice

Posts are generated with:
- **Tone**: Sarcastic, British wit, dark humour
- **Length**: One paragraph max (150 words)
- **Style**: Punches at corporate nonsense, genuine observations
- **No engagement tactics**: No "What do you think?" or CTAs
- **Emojis**: Only 👀 at start (watching the madness unfold)

Examples of topics it handles well:
- "Why synergy is meaningless"
- "The hustle culture lie"
- "Remote work statistics everyone ignores"
- Article URLs about workplace trends

## Deployment

### Render
Service is deployed at https://linkedin-sinj.onrender.com

**Build Command:**
```
cd "LinkedIn Poster/mcp-server" && npm install
```

**Start Command:**
```
cd "LinkedIn Poster/mcp-server" && npm start
```

**Environment Variables:**
Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY, TELEGRAM_BOT_TOKEN in Render dashboard

## Stack

- **Frontend**: React 19, Vite, Framer Motion
- **Backend**: Express.js, Node.js
- **AI**: OpenAI GPT-4, DALL-E-3
- **Database**: Supabase (PostgreSQL)
- **Auth**: LinkedIn OAuth 2.0
- **Bot**: Telegram Bot API
- **Hosting**: Render

## Project Structure

```
LinkedIn Poster/
├── src/                    # React frontend
├── mcp-server/            # Express backend
│   ├── server.js          # Main API
│   ├── telegram-bot.js    # Bot integration
│   └── package.json       # Backend deps
├── package.json           # Frontend deps
├── render.yaml            # Render config
└── README.md             # This file
```

## Key Files

- `mcp-server/server.js` - OAuth, API endpoints, scheduling
- `mcp-server/telegram-bot.js` - Telegram bot logic
- `src/App.jsx` - React frontend
- `render.yaml` - Production deployment config

## Recent Updates

- ✅ **Clean UI Theme** - Solid deep red background, no overlays or gradients
- ✅ **Improved Spacing** - Reduced padding and margins to fit content above the fold
- ✅ **White Input Fields** - High contrast white backgrounds with dark text
- ✅ **Black Action Buttons** - All buttons now black except LinkedIn Connect (blue)
- ✅ **Sarcastic AI Voice** - Dark humour and British wit
- ✅ **URL-Based Generation** - Generate posts from article URLs
- ✅ **Telegram Bot** - Full confirmation flow with inline buttons
- ✅ **Auto-Image Generation** - DALL-E-3 powered images
- ✅ **Deployed to Render** - Production ready at https://linkedin-sinj.onrender.com
- ✅ **Supabase Storage** - Persistent tokens and scheduled posts
- ✅ **PWA Support** - Install as mobile app

## Troubleshooting

**"LinkedIn token expired"**
- Use `/connect` in Telegram or click "Connect LinkedIn" in web UI

**"Image generation failed"**
- Check OpenAI account has DALL-E-3 access
- Verify API key is valid

**"Post won't publish"**
- Check LinkedIn OAuth credentials
- Verify member ID is correct
- Check token hasn't expired

**Bot not responding**
- Make sure TELEGRAM_BOT_TOKEN is set
- Check backend is running: `npm run start-all`
- Verify no other bot instance is running

## Future Ideas

- Multi-language support
- Post analytics tracking
- Hashtag optimization
- Scheduled digest emails
- Content templates
- A/B testing variants
- Analytics dashboard

## License

MIT

---

**Want to contribute?** Submit PRs or open issues on GitHub!

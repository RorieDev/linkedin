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
- **Backend**: Express.js, node-cron, OpenAI API
- **Authentication**: LinkedIn OAuth 2.0 with OpenID Connect
- **Storage**: In-memory (tokens, scheduled posts)

## Key Features
1. **AI Content Generation** - GPT-4 generates posts with your voice
2. **Image Generation** - DALL-E-3 creates post images (on-demand, not auto)
3. **LinkedIn Publishing** - Real OAuth integration for actual posting
4. **Post Scheduling** - Schedule posts with cron-based automation
5. **Post History** - View all generated posts
6. **Voice Customization** - British English, bold/opinionated tone, emoji bookends (🚨)

## Voice Guidelines
Posts are generated with:
- Bold, opinionated tone challenging conventional wisdom
- Humour and wit
- Concise, punchy style (max 2-3 paragraphs)
- No emojis except 🚨 at start and end
- British English (colour, organisation, realise, etc.)
- No clichéd engagement tactics
- Sharp observations over forced CTAs

## System Prompt
Located in `mcp-server/server.js` lines 129-144. Controls all AI generation behavior.

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

## Recent Changes

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
- Backend: In-memory objects (tokens, scheduledPosts)
  - Note: Resets on server restart - use database for persistence in production

### Scheduling
- Cron job runs every minute (`* * * * *`)
- Checks scheduledPosts for due posts
- Automatically publishes when time is reached
- Updates status: scheduled → publishing → published/failed

## Common Issues

**Post generation ignores my input**
- Ensure backend is running latest version
- Check system prompt in server.js has CRITICAL instructions
- Lower temperature = more focused, less random

**Image won't generate**
- Verify OPENAI_API_KEY is valid
- Check OpenAI account has DALL-E-3 access
- Ensure topic is descriptive enough

**LinkedIn posting fails**
- Confirm OAuth credentials are correct
- Check memberID is valid
- Verify token hasn't expired

**Scheduled posts not publishing**
- Check server logs for cron job execution
- Ensure scheduledTime is in future
- Verify token exists for memberId

## Future Improvements
- Persistent database for posts/tokens
- User authentication system
- Multiple account support
- Post analytics/performance tracking
- Content templates
- Hashtag optimization
- Multi-language support

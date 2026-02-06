# 🚀 Quick Start Guide

## One-Command Startup

Start both frontend and backend servers with a single command:

```bash
npm start
```

Or:

```bash
npm run start-all
```

Or directly:

```bash
./start.sh
```

## What This Does

The startup script automatically:
1. Checks for required `.env` file with API keys
2. Kills any existing processes on ports 5173 (frontend) and 4000 (backend)
3. Starts Express backend server
4. Starts Vite frontend dev server
5. Opens both URLs for you
6. Displays real-time logs

## Requirements

Before running startup, ensure you have:

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd mcp-server
npm install
cd ..
```

### 2. Create `.env` File
Create `mcp-server/.env` with your API credentials:

```
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:4000/auth/linkedin/callback
OPENAI_API_KEY=sk-proj-your_openai_key_here
PORT=4000
```

**Get these from:**
- **LinkedIn**: [LinkedIn Developers](https://www.linkedin.com/developers)
- **OpenAI**: [API Keys](https://platform.openai.com/api-keys)

## After Startup

Once running, you'll see:

```
🚀 Starting LinkedIn Poster...

📡 Starting backend server on http://localhost:4000...
✅ Backend running (PID: XXXXX)

🎨 Starting frontend server on http://localhost:5173...
✅ Frontend running (PID: XXXXX)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 LinkedIn Poster is ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend: http://localhost:5173
Backend:  http://localhost:4000
```

### Open in Browser
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000

## Using the App

### 1. Connect LinkedIn
Click "Connect LinkedIn" button in top-right corner

### 2. Generate Post
- Type your topic in "What's on your mind?"
- Click "Generate with AI"
- Edit the generated post if needed

### 3. (Optional) Generate Image
- Click "Generate Image" button
- Click again to generate different images
- Only generates images you'll actually use

### 4. Post to LinkedIn
- Click "Post Now" to publish immediately
- Or "Schedule" to publish later

### 5. View History
- Click "History" tab to see all posts
- Click "Schedule" tab to manage scheduled posts

## Monitoring

### View Logs
```bash
# Frontend logs
tail -f frontend.log

# Backend logs
tail -f backend.log
```

### Check Server Status
```bash
# Check if servers are running
lsof -i :5173   # Frontend
lsof -i :4000   # Backend
```

## Troubleshooting

### Port Already in Use
```bash
# Stop existing servers
npm run stop

# Or manually kill processes
pkill -f vite
pkill -f "node.*server.js"

# Then restart
npm start
```

### .env File Missing
```bash
cd mcp-server
cp .env.example .env  # If template exists
# OR manually create with your API keys
touch .env
```

### Backend Won't Start
```bash
# Check logs
cat backend.log

# Ensure Node.js dependencies are installed
cd mcp-server
npm install
npm start
```

### Frontend Won't Start
```bash
# Check logs
cat frontend.log

# Ensure Node.js dependencies are installed
npm install
npm run dev
```

### API Key Issues
- Verify `OPENAI_API_KEY` is valid and hasn't expired
- Confirm `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` match your OAuth app
- Check `LINKEDIN_REDIRECT_URI` is registered in your LinkedIn app settings

## Stopping Servers

```bash
npm run stop
```

Or press `Ctrl+C` in the terminal.

## Manual Startup (If Script Fails)

### Terminal 1: Backend
```bash
cd mcp-server
npm start
# Runs on http://localhost:4000
```

### Terminal 2: Frontend
```bash
npm run dev
# Runs on http://localhost:5173
```

## Next Steps

1. Read [claude.md](./claude.md) for full project documentation
2. Check the [API Endpoints](./claude.md#api-endpoints) section
3. Customize the [System Prompt](./mcp-server/server.js) for your voice
4. Review [Voice Guidelines](./claude.md#voice-guidelines) for tone/style

## Support

If issues persist:
1. Check both log files
2. Verify all dependencies are installed (`npm install`)
3. Ensure `.env` has all required variables
4. Confirm ports 5173 and 4000 are available
5. Restart: `npm run stop && npm start`

# Thermomix Chatbot for Next.js

A standalone conversational chatbot component for Next.js applications, specifically designed for Thermomix.guru. Features voice input/output, text chat, and AI-powered responses using OpenAI.

## Features

- 🎤 **Voice Input/Output**: Speech-to-text and text-to-speech using Web Speech API
- 💬 **Text Chat**: Traditional keyboard input
- 🤖 **AI-Powered**: Uses OpenAI GPT-3.5-turbo for intelligent responses
- 🌍 **Multi-language**: Supports multiple languages (English, Arabic, etc.)
- 📱 **Responsive**: Mobile-friendly design
- ⚡ **Next.js Ready**: Built specifically for Next.js/React

## Installation

1. Copy the files to your Next.js project:
   ```
   components/ThermomixChatbot.tsx
   styles/thermomix-chatbot.css
   app/api/chat/route.ts (or pages/api/chat.ts for Pages Router)
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install openai
   ```

3. Set environment variable (optional - can also provide API key via client-side config):
   ```bash
   # .env.local
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   **Note**: If you don't set the environment variable, users can enter their own API key via the settings button in the chatbot widget.

4. Use the component in your page:
   ```tsx
   import ThermomixChatbot from '@/components/ThermomixChatbot';

   export default function Page() {
     return <ThermomixChatbot />;
   }
   ```

## Configuration

### System Prompt

Edit the system prompt in `ThermomixChatbot.tsx` to customize the chatbot's behavior:

```tsx
const SYSTEM_PROMPT = `You are an expert Thermomix cooking assistant...`;
```

### Voice Selection

The chatbot automatically selects voices based on the user's language. You can customize voice selection in the component.

### Styling

Modify `styles/thermomix-chatbot.css` to match your site's design.

## API Route

The chatbot requires a Next.js API route at `/api/chat` that proxies requests to OpenAI. This keeps your API key secure on the server.

## Browser Compatibility

- **Voice Input**: Chrome, Edge, Safari (iOS 14.5+), Android Chrome
- **Voice Output**: All modern browsers
- **Text Chat**: All browsers

## Notes

- Voice features require HTTPS (or localhost for development)
- iOS Safari has some limitations with voice features
- The component is self-contained and doesn't require jQuery or other dependencies


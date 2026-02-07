# Thermomix Chatbot - Standalone HTML Component for Builder.io

A standalone HTML component that can be embedded directly in Builder.io without any build process or dependencies.

## Features

- 🎤 **Voice Input/Output**: Speech-to-text and text-to-speech using Web Speech API
- 💬 **Text Chat**: Traditional keyboard input
- 🤖 **AI-Powered**: Uses OpenAI GPT-3.5-turbo for intelligent responses
- 🌍 **Multi-language**: Supports multiple languages (English, Arabic, etc.)
- 📱 **Responsive**: Mobile-friendly design
- 🔒 **API Key Management**: Users can enter their own API key or use server-side configuration
- ⚡ **Zero Dependencies**: Pure HTML, CSS, and JavaScript - no frameworks required

## Installation in Builder.io

### Option 1: Custom Code Component (Recommended)

1. In Builder.io, go to your model/section where you want to add the chatbot
2. Add a **Custom Code** component
3. Copy the entire contents of `thermomix-chatbot.html` (everything between `<div class="thermomix-chatbot-container">` and `</div>`)
4. Paste it into the Custom Code component
5. Copy the `<style>` section and paste it into the CSS section of the Custom Code component
6. Copy the `<script>` section and paste it into the JavaScript section of the Custom Code component

### Option 2: HTML Embed

1. Copy the entire `thermomix-chatbot.html` file
2. In Builder.io, add an **HTML Embed** component
3. Paste the HTML code

### Option 3: External File (for multiple pages)

1. Host `thermomix-chatbot.html` on your server or CDN
2. In Builder.io, use an **HTML Embed** component with an iframe:
   ```html
   <iframe src="https://your-domain.com/thermomix-chatbot.html" 
           style="width: 100%; height: 600px; border: none;"></iframe>
   ```

## Configuration

### API Key Setup

The chatbot supports two methods for API key configuration:

1. **User Input** (Default): Users click the ⚙️ settings button and enter their own OpenAI API key. The key is stored in localStorage.

2. **Server-Side Proxy** (Recommended for production): 
   - Create a server endpoint that proxies requests to OpenAI
   - Set the endpoint in the component:
   ```javascript
   window.THERMOMIX_API_ENDPOINT = 'https://your-domain.com/api/chat';
   ```
   - Modify the `callOpenAI` function to use your endpoint instead of direct OpenAI calls

### Customizing the System Prompt

Edit the `SYSTEM_PROMPT` constant in the JavaScript section to customize the chatbot's behavior.

### Styling

All styles are in the `<style>` section. Modify colors, fonts, sizes, etc. to match your brand.

## Browser Compatibility

- **Voice Input**: Chrome, Edge, Safari (iOS 14.5+), Android Chrome
- **Voice Output**: All modern browsers
- **Text Chat**: All browsers

## Notes

- Voice features require HTTPS (or localhost for development)
- iOS Safari has some limitations with voice features
- The component is completely self-contained - no external dependencies
- API keys are stored in localStorage (consider security implications for production)

## Security Considerations

For production use, consider:

1. **Server-Side Proxy**: Don't expose OpenAI API keys to clients. Create a server endpoint that:
   - Validates requests
   - Adds rate limiting
   - Handles API keys server-side
   - Logs usage

2. **API Key Validation**: If allowing user-provided keys, validate them before use

3. **CORS**: If using a proxy endpoint, ensure CORS headers are properly configured

## Example Server-Side Proxy (Node.js/Express)

```javascript
app.post('/api/chat', async (req, res) => {
  const { message, conversationHistory } = req.body;
  
  // Validate request, add rate limiting, etc.
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    })
  });
  
  const data = await response.json();
  res.json(data);
});
```

Then set in the component:
```javascript
window.THERMOMIX_API_ENDPOINT = '/api/chat';
```

## Troubleshooting

- **Voice not working**: Ensure you're on HTTPS or localhost
- **API errors**: Check that the API key is valid and has credits
- **Styling issues**: Ensure the CSS is properly loaded in Builder.io
- **Script errors**: Check browser console for errors


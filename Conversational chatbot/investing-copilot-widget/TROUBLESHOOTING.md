# Troubleshooting React Error #31

## The Issue

You're seeing this error:
```
Uncaught Error: Minified React error #31
at chatbot.js?ver=1762859772:40
```

**This error is NOT coming from the Investing Copilot widget!**

## Root Cause

The error is coming from `chatbot.js?ver=1762859772` - this is another plugin or theme on your WordPress site that:
1. Has its own chatbot functionality
2. Is using React
3. Is trying to render an object as a React child (which is invalid)

## How to Find the Conflicting Plugin

### Method 1: Check Your Plugins

Look for plugins with these keywords:
- **chatbot**
- **chat**
- **live chat**
- **customer support**
- **messenger**

Common culprits:
- Tidio Live Chat
- Tawk.to
- LiveChat
- Zendesk Chat
- Drift
- Intercom
- WP Chatbot
- ChatBot for WordPress

### Method 2: Use Browser DevTools

1. Open browser DevTools (F12)
2. Go to **Sources** tab
3. Search for `chatbot.js`
4. Look at the file path - it will show you which plugin it belongs to

### Method 3: Deactivate Plugins One by One

1. Go to WordPress Admin → Plugins
2. Deactivate all plugins except "Investing Copilot Widget"
3. Check if error persists
4. Reactivate plugins one by one to find the culprit

## Solution Options

### Option 1: Update the Conflicting Plugin
The other chatbot plugin has a bug. Update it to the latest version.

### Option 2: Disable the Conflicting Plugin
If you don't need both chatbots, disable the conflicting one.

### Option 3: Contact the Other Plugin's Support
Report the React error #31 to them - it's a bug in their code.

### Option 4: Use Our Widget Alone
Our Investing Copilot widget is fully functional and doesn't need another chatbot.

## Why Our Widget Still Works

Even though the error shows in the console, our widget includes:
- ✅ Error Boundary to catch internal errors
- ✅ Validation at multiple levels
- ✅ Protected initialization code
- ✅ localStorage corruption handling

The error is from the other chatbot, not ours!

## Still Having Issues?

If you need help identifying the conflicting plugin:
1. Share the full URL of `chatbot.js` from the error
2. List your active plugins
3. Share your theme name

The version number `ver=1762859772` is a Unix timestamp (Nov 12, 2025) which suggests the file was recently updated or cached.


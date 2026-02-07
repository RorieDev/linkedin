# Investment Advisor Chatbot - AI Developer Guide

## Architecture Overview

This is a **WordPress plugin** that provides an AI-powered investment advisor chatbot with voice capabilities. Single-file PHP architecture with frontend assets.

### Core Components

- **`investment-advisor-chatbot.php`** (980 lines): Main plugin class, WordPress hooks, AJAX endpoints, admin UI
- **`assets/js/investment-advisor.js`** (1714 lines): jQuery-based frontend, Web Speech API integration, OpenAI streaming
- **`assets/css/investment-advisor.css`** (729 lines): Responsive styles with mobile-first approach
- **`assets/css/admin.css`**: WordPress admin panel styling

### Data Flow

1. User speaks/types → `investment-advisor.js` captures input
2. Speech recognition transcripts cleaned (Android duplicate word removal)
3. Message sent to OpenAI via PHP AJAX handler or direct fetch from frontend
4. Response streamed back and optionally spoken via Web Speech API
5. Conversation state maintained in DOM, not persisted server-side

## Critical Domain-Specific Patterns

### Multi-Tenant System Prompt Architecture

The plugin supports **domain-based prompt switching** - automatically detects visitor's domain and applies custom system prompts:

```php
// Auto-detect in shortcode_handler()
$current_domain = strtolower($_SERVER['HTTP_HOST']);
if (strpos($current_domain, $domain1_url) !== false) {
    $system_prompt = get_option('investment_advisor_domain1_prompt');
}
```

Admin can configure 3 domain-specific prompts (e.g., healthcare.com, realtor.net, legal.org). This allows one plugin installation to serve multiple client websites with different AI personalities.

### Android Speech Recognition Fix

**Critical bug solved**: Android duplicates words in continuous mode ("what what is what is an ETF").

```javascript
// Iterative pattern removal in investment-advisor.js
function removeDuplicatePatterns(text) {
    let cleaned = text;
    let hasChanges = true;
    while (hasChanges) {
        const before = cleaned;
        // Remove 1-word, 2-word, 3-word, 4-word, 5-word duplicate patterns
        cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
        cleaned = cleaned.replace(/\b(\w+\s+\w+)\s+\1\b/gi, '$1');
        // ... up to 5-word patterns
        hasChanges = (before !== cleaned);
    }
    return cleaned;
}
```

Applied in `autoSendMessage()` before sending to AI AND for display cleanup.

### iOS Speech Synthesis Warmup

iOS Safari cuts off the first word unless speech engine is "warmed up":

```javascript
// One-time warmup on first user interaction
$(document).one('click touchstart', function() {
    const warmupUtterance = new SpeechSynthesisUtterance('');
    warmupUtterance.volume = 0;
    speechSynthesis.speak(warmupUtterance);
});
```

### Voice Selection System

Flexible voice selection by **name** (e.g., "Daniel") or **language code** (e.g., "en-GB"):

```javascript
function getVoice(langOrName) {
    // Try exact voice name first (platform-specific)
    let voice = availableVoices.find(v => v.name === langOrName);
    // Fallback to language code (cross-platform)
    if (!voice) voice = availableVoices.find(v => v.lang === langOrName);
    return voice || null;
}
```

Admin panel includes voice testing and device capability detection.

### WordPress Integration Patterns

```php
// Shortcode renders chatbot anywhere
add_shortcode('investment_advisor', array($this, 'shortcode_handler'));

// AJAX handlers for Google Search & Yahoo Finance
add_action('wp_ajax_investment_advisor_google_search', ...);
add_action('wp_ajax_nopriv_investment_advisor_google_search', ...);

// API key stored in wp_options (encrypted via WordPress)
$api_key = get_option('investment_advisor_api_key', '');
```

**No database tables** - everything uses WordPress options API.

### Alpaca Trading Integration

The chatbot integrates with the **TamRor Alpaca Paper Trading module** on the same WordPress page (e.g., `allvesta.ai/western-investing-english`).

**How it works:**

1. User says: "buy 1 Tesla share" or "sell 5 shares of AAPL"
2. OpenAI function calling detects trade intent via `execute_trade` function
3. Chatbot dispatches `tamror:trade` custom event
4. Trading module auto-fills form and submits order to Alpaca paper API

```javascript
// Function definition sent to OpenAI
const functions = [{
    name: 'execute_trade',
    description: 'Execute a stock trade (buy or sell) via Alpaca paper trading',
    parameters: {
        type: 'object',
        properties: {
            symbol: { type: 'string', description: 'Stock ticker (e.g., TSLA, AAPL)' },
            side: { type: 'string', enum: ['buy', 'sell'] },
            quantity: { type: 'integer', minimum: 1 }
        },
        required: ['symbol', 'side', 'quantity']
    }
}];

// Execution in investment-advisor.js
async function executeTrade(symbol, side, quantity) {
    // Dispatch event to trading module
    window.dispatchEvent(new CustomEvent('tamror:trade', {
        detail: { symbol: symbol.toUpperCase(), side, quantity }
    }));
    
    // Auto-fill and submit order form
    document.getElementById('symbol').value = symbol;
    document.getElementById('side').value = side;
    document.getElementById('qty').value = quantity;
    setTimeout(() => document.getElementById('placeOrder').click(), 800);
}
```

**Trading module listens for events** in `trading_module.html`:

```javascript
window.addEventListener("tamror:trade", function(e){
    var d = (e && e.detail) || {};
    handleTradeEvent(d.symbol, d.side);
});
```

**Key requirements:**
- Both chatbot and trading module must be on same page
- Trading module uses WordPress REST API proxy at `/wp-json/alpaca/v1`
- Alpaca paper API credentials configured in proxy (never exposed to frontend)
- OpenAI function calling requires GPT-3.5-turbo or newer

## Key Developer Workflows

### Testing Voice Features Locally

1. Run WordPress locally with HTTPS (voice requires secure context)
2. Admin panel → Settings → Investment Advisor → "Test Voice" button
3. Check browser console for `[Voices] Loaded X voices` and `[Speech] ...` logs
4. Test on iOS Safari, Android Chrome, and desktop Chrome separately

### Debugging Android Speech Issues

```javascript
// Enable verbose logging in investment-advisor.js
console.log('[Android] Interim transcript:', interimTranscript);
console.log('[Android] Before cleaning:', finalTranscript);
console.log('[Android] After cleaning:', cleanedTranscript);
```

Check for duplicate patterns in Chrome DevTools on Android device via USB debugging.

### Adding New API Integrations

Follow the Yahoo Finance pattern in `investment-advisor-chatbot.php`:

```php
// 1. Add AJAX action
add_action('wp_ajax_your_api', array($this, 'ajax_your_api'));

// 2. Create handler
public function ajax_your_api() {
    check_ajax_referer('investment_advisor_nonce', 'nonce');
    $result = $this->perform_your_api_call();
    wp_send_json_success($result);
}

// 3. Frontend call from investment-advisor.js
$.ajax({
    url: investmentAdvisorAjax.ajax_url,
    type: 'POST',
    data: {
        action: 'investment_advisor_your_api',
        nonce: investmentAdvisorAjax.nonce,
        param: value
    }
});
```

## Platform-Specific Quirks

### Chrome Password Manager Prevention

Input field uses readonly trick to prevent autofill:

```html
<input readonly onfocus="this.removeAttribute('readonly');"
       data-1p-ignore="true" data-lpignore="true" autocomplete="off">
```

### iOS Voice Limitations

- Voices load asynchronously - use `speechSynthesis.onvoiceschanged`
- Must call `speak()` synchronously in event handler (not in Promise)
- Long text requires chunking (utterance max length ~32k chars)

### Android Speech Recognition

- Continuous mode causes word duplication
- Interim results update faster than iOS
- Requires periodic state checks (`setInterval` polling for stuck states)

## File Conventions

### CSS State Classes

```css
.send-btn.speaking    /* Bot is talking, show speaker icon */
.mic-btn.recording    /* User voice input active */
.stop-btn.active      /* Stop button visible */
.typing-indicator     /* Bot is "typing" (thinking) */
```

### JavaScript State Variables

```javascript
let isRecording = false;      // Mic active
let isSpeaking = false;       // Bot talking
let isProcessing = false;     // API request in flight
let isCancelling = false;     // Prevent auto-send during cancel
let isVoiceInput = false;     // Track input source
```

State synchronization critical - Android polling checks every 500ms for stuck states.

## Version History Context

**Current**: v3.4.4 (Nov 2025)

Recent major changes:
- **3.4.0**: Domain-based system prompts (multi-tenant support)
- **3.3.0**: Android duplicate word fix (iterative pattern removal)
- **3.2.0**: Chrome autofill prevention, placeholder removal
- **3.0.0**: Advanced voice selection (60+ voices, language codes)

See `readme.txt` changelog section for detailed version notes and developer TODO comments.

## External Dependencies

- **OpenAI API**: GPT-3.5-turbo for conversations (streaming enabled, function calling for trades)
- **Yahoo Finance API**: Free stock quotes (no key required)
- **Google Custom Search API**: Optional market data (requires key)
- **Web Speech API**: Browser-native voice input/output
- **jQuery**: Frontend dependency (WordPress core includes it)
- **Alpaca Markets API**: Paper trading via WordPress REST proxy at `/wp-json/alpaca/v1`

## Build & Deployment

No build process - direct file editing. WordPress auto-loads PHP changes.

For production deployment:
1. Zip the `investment-advisor-plugin/` directory
2. Upload via WordPress admin → Plugins → Add New → Upload
3. Configure API keys in Settings → Investment Advisor

Testing checklist:
- Voice input on iOS Safari (iPhone/iPad)
- Voice input on Android Chrome
- Desktop Chrome/Firefox/Safari
- Elementor page builder compatibility
- Mobile responsive (320px - 1920px)

## Common Gotchas

1. **Voices not loading**: Call `loadVoices()` on user interaction + voiceschanged event
2. **First word cut off on iOS**: Missing warmup utterance
3. **Android duplicates words**: Missing `removeDuplicatePatterns()` call
4. **API key not working**: Check CORS, nonce verification, and `wp_ajax_*` hooks
5. **Widget not rendering**: Verify shortcode in post/page, check browser console for JS errors
6. **Alpaca trades not executing**: 
   - Verify trading module is on same page
   - Check `/wp-json/alpaca/v1/ping` returns `{ok: true}`
   - Ensure both modules loaded (check console for `[Function Call]` log)
   - Verify `placeOrder` button exists in DOM

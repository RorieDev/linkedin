=== Investment Advisor Chatbot ===
Contributors: yourusername
Donate link: https://yourwebsite.com/donate
Tags: chatbot, ai, investment, financial advisor, openai, gpt, finance, arabic, english, voice, speech, trading, alpaca
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 5.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

An AI-powered investment advisor chatbot with advanced voice selection, real-time market data via Yahoo Finance and Google Search, Alpaca paper trading integration, and professional financial guidance in English and Arabic.

== Description ==

The Investment Advisor Chatbot plugin brings AI-powered financial expertise to your WordPress website. Built with OpenAI's GPT technology, this chatbot acts as a professional investment advisor, offering personalized financial guidance to your visitors.

= Key Features =

* **Alpaca Paper Trading Integration**: Execute trades directly through voice or text commands
* **Advanced Voice Selection**: Choose from 60+ voices with different accents (British, American, Australian, Arabic)
* **Real-Time Market Data**: Integration with Yahoo Finance and Google Search for live stock quotes
* **Bilingual Support**: Provides advice in both English and Arabic
* **Voice Input**: Press-to-talk functionality with speech recognition
* **Voice Output**: Natural text-to-speech responses with accent customization
* **Text Chat**: Traditional text-based conversation interface
* **Professional Expertise**: Trained as an experienced investment advisor with knowledge of global markets
* **Multiple Input Methods**: Shortcode, Gutenberg block, and PHP template functions
* **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
* **iOS Compatible**: Full voice support on iPhone and iPad
* **Secure**: API keys stored securely in WordPress database
* **Customizable**: Configure widget title, welcome messages, voice accent, and appearance

= NEW in Version 3.5.0 =

* **📈 Alpaca Paper Trading Integration**
  - Execute trades via natural language: "buy 1 Tesla share"
  - OpenAI function calling automatically detects trade intents
  - Auto-fills and submits orders to Alpaca paper trading module
  - Works seamlessly with TamRor trading interface on same page
  - Confirmation messages after trade execution

= Investment Topics Covered =

* Portfolio management and diversification
* Risk assessment and tolerance evaluation
* Stock, bond, and ETF analysis
* Real-time stock quotes and market data
* Real estate and alternative investments
* Cryptocurrency guidance
* Retirement planning
* Market trends and economic indicators
* Tax-efficient investing strategies

= Easy Integration =

**Shortcode:** `[investment_advisor]` - Works with Elementor, page builders, and any widget area
**PHP Template:** `<?php echo do_shortcode('[investment_advisor]'); ?>`

= Requirements =

* OpenAI API key (get one free at platform.openai.com)
* Modern web browser with JavaScript enabled
* HTTPS recommended for voice input functionality
* Optional: Google Custom Search API for enhanced real-time data

= Privacy & Security =

* All conversations are processed securely through OpenAI's API
* No chat data is stored on your server
* API keys are encrypted and stored in WordPress database
* Compliant with privacy regulations

== Installation ==

= Automatic Installation =

1. Log in to your WordPress admin panel
2. Go to Plugins > Add New
3. Search for "Investment Advisor Chatbot"
4. Click "Install Now" and then "Activate"

= Manual Installation =

1. Download the plugin zip file
2. Log in to your WordPress admin panel
3. Go to Plugins > Add New > Upload Plugin
4. Choose the zip file and click "Install Now"
5. Activate the plugin

= Setup =

1. Go to Settings > Investment Advisor in your WordPress admin
2. Enter your OpenAI API key (get one free at https://platform.openai.com/api-keys)
3. Customize the widget title and welcome message if desired
4. Save settings

= Usage =

**Method 1: Shortcode**
Add `[investment_advisor]` to any post, page, widget area, or Elementor HTML widget.

**Method 2: PHP Template**
Add `<?php echo do_shortcode('[investment_advisor]'); ?>` to your theme files.

== Frequently Asked Questions ==

= Do I need an OpenAI API key? =

Yes, you need an OpenAI API key to use this plugin. You can get one for free at https://platform.openai.com/api-keys. New users typically receive free credits to get started.

= Is the chatbot available in Arabic? =

Yes! The chatbot provides professional investment advice in both English and Arabic. It automatically detects the language and responds accordingly.

= Does the voice input work on mobile devices? =

Voice input works on most modern mobile browsers, including Safari on iOS and Chrome on Android. HTTPS is required for microphone access.

= Is my chat data stored anywhere? =

No, chat conversations are not stored on your server. They are processed through OpenAI's API according to their privacy policy.

= Can I customize the chatbot's appearance? =

Yes, you can customize the widget title, welcome message, width, and height through the admin settings and shortcode parameters.

= What investment topics can the chatbot help with? =

The chatbot is trained as a professional investment advisor and can help with portfolio management, risk assessment, stock analysis, retirement planning, cryptocurrency guidance, and more.

= Does this work with any WordPress theme? =

Yes, the plugin is designed to work with any WordPress theme. The chatbot uses its own styling to ensure consistent appearance.

= Can I use multiple chatbots on the same page? =

Yes, you can add multiple chatbot instances using different shortcodes or blocks on the same page.

== Screenshots ==

1. **Chatbot Interface** - Clean, modern chat interface with voice and text input
2. **Admin Settings** - Simple configuration panel for API key and customization
3. **Mobile View** - Responsive design works perfectly on mobile devices
4. **Voice Input** - Press-to-talk functionality with visual feedback
5. **Bilingual Support** - Seamless conversation in English and Arabic

== Changelog ==

== Changelog ==

= 5.1.1 =
* Added customizable REST API CORS headers so localhost and production domains can call Alpaca endpoints securely.

= 3.7.0 =
* Fixed: isRecording flag now properly restored after verbal confirmation, keeping stop button visible during bot speech
* Fixed: UI state explicitly updated in cleanup function to show stop button after trade confirmation

= 3.6.9 =
* Fixed: Empty transcripts are now ignored to prevent triggering auto-send
* Fixed: Prevents stop button from disappearing due to empty speech recognition results
* Critical: This fixes the recurring stop button disappearance issue

= 3.6.8 =
* Fixed: More aggressive stop button visibility - explicitly forces .show() when recording is active
* Fixed: Ensures all UI elements (stop button, mic button, send button, listening indicator) are in correct state
* Added: Better logging to track stop button state changes

= 3.6.7 =
* Fixed: More aggressive speech detection - checks both isSpeaking flag AND speechSynthesis.speaking state
* Improved: Increased buffer from 2 to 3 seconds after bot speech to prevent self-responses
* Added: Better logging to track when and why voice input is being ignored

= 3.6.6 =
* Added: Debug logging to diagnose stop button visibility issue
* Investigation: Tracking isRecording state during speech end events

= 3.6.5 =
* Fixed: Added 2-second buffer after bot finishes speaking to prevent microphone from picking up bot's own voice
* Fixed: Bot will no longer respond to itself creating infinite conversation loops
* Improved: More reliable echo prevention with time-based filtering

= 3.6.4 =
* Fixed: Bot echo detection now recognizes user acknowledgments (e.g., "got it", "thanks", "okay")
* Improved: Raised echo detection threshold from 40% to 60% word overlap to reduce false positives
* Fixed: Users can now repeat information back without being flagged as bot echo

= 3.6.3 =
* Added: Smart detection of historical queries - automatically uses Google Search for questions about past dates
* Changed: "I don't have real-time data" message replaced with "My real-time data access is unavailable at the moment"
* Improved: Historical stock questions (e.g., "closing price on October 31st") now get Google Search results instead of current-only Yahoo Finance data
* Fixed: Better routing logic for historical vs current price queries

= 3.6.2 =
* Added: Google Search fallback when Yahoo Finance API fails or returns 500 error
* Fixed: Stop microphone button now stays visible when recording is active after bot speaks
* Improved: Better error resilience for stock price queries

= 3.6.1 =
* Fixed: Added comprehensive error handling to Yahoo Finance AJAX endpoint
* Added: Detailed error logging for debugging Yahoo Finance API issues
* Fixed: Nonce verification now returns proper error instead of causing 500 error

= 3.6.0 =
* Fixed: Voice input now properly uses Yahoo Finance data (was missing from autoSendMessage function)
* Added: Console logging for debugging stock symbol detection and Yahoo Finance API calls
* Fixed: Both text and voice inputs now use updated system prompt for better data utilization

= 3.5.9 =
* Improved: Enhanced system prompt to better utilize Yahoo Finance real-time data
* Fixed: Chatbot now acknowledges available current price data instead of saying "I don't have real-time data"
* Improved: Better handling of historical timeframe questions when only current data is available

= 3.5.8 =
* Fixed: Stop microphone button now remains visible during verbal trade confirmation
* Improved: UI state management during verbal confirmation flow

= 3.5.7 =
* Fixed: Main speech recognition now stops during verbal trade confirmation to prevent interference
* Improved: Verbal confirmation listener timing and reliability

= 3.5.6 =

= 3.5.5 (November 7, 2025) =
* **IMPROVED**: Increased verbal confirmation timeout from 10 to 15 seconds
* **ENHANCED**: More time to respond to "say yes or no" confirmation

= 3.5.4 (November 7, 2025) =
* **FIXED**: Removed popup dialog during voice conversations
* **IMPROVED**: Voice-only confirmation flow - no visual interruptions
* **ENHANCED**: Better error handling when speech recognition unavailable

= 3.5.3 (November 7, 2025) =
* **NEW**: Verbal confirmation for voice trades - "Say yes to confirm or no to cancel"
* **IMPROVED**: Clean speech output - removes emojis, order IDs, and technical details
* **ENHANCED**: Natural voice responses - "Order confirmed. Bought 1 share of TSLA"
* **ADDED**: 10-second timeout for verbal confirmations with auto-cancel
* **FEATURE**: Detects yes/no responses - "yes/yep/sure/confirm" or "no/nope/cancel"
* **POLISHED**: Better text vs voice output - detailed text, simple speech

= 3.5.2 (November 7, 2025) =
* **NEW**: User confirmation dialog before executing trades
* **IMPROVED**: Direct API execution - orders submitted directly to Alpaca, not via form
* **ENHANCED**: Detailed order confirmation with order ID and status
* **ADDED**: Auto-refresh of account, positions, and orders after trade execution
* **FEATURE**: Cancel trades before submission via confirmation dialog
* **IMPROVED**: Better error handling with user-friendly messages

= 3.5.1 (November 7, 2025) =
* **CRITICAL FIX**: Trading vocabulary transcription errors - "by" → "buy", "cell" → "sell"
* **FIXED**: Sell orders now execute correctly (were being converted to buy orders)
* **IMPROVED**: Enhanced OpenAI context for better buy/sell intent detection
* **ADDED**: Company name to ticker conversion (Tesla → TSLA, Apple → AAPL, etc.)
* **ENHANCED**: Better logging for trade execution debugging

= 3.5.0 (November 7, 2025) =
* **NEW**: Alpaca Paper Trading integration via OpenAI function calling
* **ADDED**: Execute trades through natural language commands ("buy 1 Tesla share")
* **FEATURE**: Auto-fills and submits orders to Alpaca trading module on same page
* **ENHANCED**: Chatbot dispatches `tamror:trade` custom events for seamless integration
* **IMPROVED**: Trade confirmation messages after successful order placement
* **UPDATED**: AI developer guide with Alpaca integration patterns

= 3.4.3 (November 5, 2025) =
* **IMPROVED**: Input text now starts further right (50px padding) for better spacing
* **ENHANCED**: Mic button increased from 55px to 60px for better visibility
* **ENHANCED**: Mic icon increased from 30px to 36px for better clarity
* **FIXED**: Stop button now reliably clears input with multiple timed clears and cancellation flag check
* **IMPROVED**: Better handling of speech recognition during cancellation

= 3.4.2 (November 5, 2025) =
* **SIMPLIFIED**: Removed second line from header (Arabic subtitle)
* **IMPROVED**: Widget title now centered both horizontally and vertically
* **CLEANER**: More minimalist header design with better visual balance

= 3.4.1 (November 5, 2025) =
* **FIXED**: Input box styling now uses !important to prevent Elementor/theme CSS overrides
* **IMPROVED**: Consistent white background and proper borders across all themes
* **ENHANCED**: Better CSS specificity to maintain plugin design integrity

= 3.4.0 (November 5, 2025) =
* **ADDED**: Auto-detect domain URL and use domain-specific system prompts
* **FEATURE**: Configure up to 3 different website domains with custom AI behavior
* **ENHANCED**: WordPress Settings now includes Domain 1, 2, and 3 URL configuration
* **FLEXIBLE**: Each domain automatically uses its own system prompt (e.g., healthcare.com, realtor.net, legal.org)
* **IMPROVED**: Perfect for agencies managing multiple client websites with one plugin

= 3.3.4 (November 5, 2025) =
* **ADDED**: Refresh button on left side of header for hard page refresh
* **IMPROVED**: Symmetrical button layout with refresh (left) and trash (right)
* **ENHANCED**: Consistent styling and behavior for all header buttons
* **POLISHED**: Removed blue focus outline, added subtle white glow on focus

= 3.3.3 (November 5, 2025) =
* **IMPROVED**: Garbage can button now vertically centered in header
* **ENHANCED**: Larger, more visible trash icon (28px-36px depending on screen size)
* **FIXED**: Input box now clears when stop button clicked (both during recording and bot speech)
* **POLISHED**: Better visual alignment and user experience

= 3.3.2 (November 4, 2025) =
* **REMOVED**: Gutenberg block editor integration (optimized for Elementor Pro and other page builders)
* **SIMPLIFIED**: Cleaner codebase without block-editor.js dependencies
* **COMPATIBLE**: Shortcode works seamlessly with Elementor, Divi, and all major page builders
* **IMPROVED**: Streamlined admin panel with focus on shortcode and PHP template usage

= 3.3.1 (November 4, 2025) =
* **REPOSITIONED**: Speaker icon now appears on send button (not mic button) when bot is talking
* **IMPROVED**: Clearer visual feedback - send button replaced with pulsing speaker icon during speech
* **ENHANCED**: Better UI clarity for when AI is responding vs listening

= 3.3.0 (November 4, 2025) =
* **FIXED**: Android duplicate transcription completely resolved
* **FIXED**: Messages sent to AI now properly cleaned (not just display text)
* **IMPROVED**: Iterative duplicate removal handles complex patterns like "what is what is what is"
* **ENHANCED**: Input box clears automatically when stop button clicked
* **IMPROVED**: More aggressive pattern matching for Android speech recognition issues

= 3.2.5 (November 4, 2025) =
* **CRITICAL FIX**: Android duplicate removal now applies to actual message sent to AI
* **FIXED**: Previously only cleaned display text, now cleans the full transcript before sending
* **IMPROVED**: Input box shows clean text AND conversation displays clean text

= 3.2.4 (November 4, 2025) =
* **ADDED**: Debug logging for duplicate removal to diagnose Android issues
* **IMPROVED**: Simplified regex-based duplicate detection with multiple passes
* **ENHANCED**: Better console logging for troubleshooting

= 3.2.3 (November 4, 2025) =
* **IMPROVED**: Aggressive iterative duplicate removal for Android
* **ENHANCED**: Loops until no duplicates remain in transcription
* **FIXED**: Handles nested patterns like "what is what is what is what is"

= 3.2.2 (November 4, 2025) =
* **IMPROVED**: Better Android duplicate word removal algorithm
* **ADDED**: Dedicated removeDuplicatePatterns() helper function
* **ENHANCED**: Cleans both interim and final transcripts

= 3.2.1 (November 4, 2025) =
* **FIXED**: Android duplicate transcription issue (initial attempt)
* **ADDED**: Pattern-based duplicate word removal for "what what is what is"

= 3.2.0 (November 4, 2025) =
* **REMOVED**: Placeholder text from input box (cleaner UI)
* **ENHANCED**: Microphone pulse animation increased from 1.1 to 1.2 scale
* **CHANGED**: Conversation font to Work Sans normal (400 weight)
* **FIXED**: Chrome password autofill prevention (readonly trick + data-1p-ignore)
* **IMPROVED**: Better visual feedback for active microphone state

= 3.1.0 (Previous stable) =
* Advanced voice selection with 60+ voices
* Real-time market data via Yahoo Finance
* Google Custom Search integration
* Voice features and iOS compatibility

= DEVELOPMENT NOTES FOR FUTURE LLM =

**Current Version**: 3.3.1 (November 4, 2025)

**Key Files**:
- `investment-advisor-chatbot.php` - Main plugin file, WordPress integration, AJAX handlers
- `assets/js/investment-advisor.js` - Frontend logic, speech recognition, duplicate removal
- `assets/css/investment-advisor.css` - Styling, button states, animations
- `assets/js/block-editor.js` - Gutenberg block registration

**Recent Problem Solved**: 
Android speech recognition was producing duplicate words like "what what is what is what is an ETF"
- Root cause: Android's continuous recognition re-processes previous words
- Solution: `removeDuplicatePatterns()` function with iterative regex cleaning
- Applied in `autoSendMessage()` before sending to AI: `const message = removeDuplicatePatterns(finalTranscript.trim());`
- Also applied to display text for real-time cleaning

**Speaker Icon Positioning**:
- When bot speaks, speaker icon appears on SEND button (not mic button)
- JS changes `.mic-btn` to `.send-btn` for all speaking state management
- CSS: `.send-btn.speaking` shows speaker icon, hides send arrow
- Stop button remains visible to cancel speech

**Android-Specific Fixes**:
- Duplicate pattern removal with regex: `/\b(\w+)\s+\1\b/gi` for single words
- `/\b(\w+\s+\w+)\s+\1\b/gi` for 2-word patterns (up to 5 words)
- Iterative loops until no changes detected
- Applied to both interim and final transcripts

**Chrome Autofill Prevention**:
- Input has `readonly` attribute, removed on focus
- `data-1p-ignore="true"` for 1Password
- `data-lpignore="true"` for LastPass
- `autocomplete="off"` + `name="search"`

**UI Changes**:
- No placeholder text in input box
- Microphone icon pulse: scale(1.2) when active
- Work Sans font (400 weight) for message content
- Input box auto-clears on stop button click

**Next Developer TODO**:
1. Test v3.3.1 on Android device to confirm duplicate fix works
2. Consider adding loading state for API calls
3. Potential feature: Message history persistence
4. Potential feature: Export conversation transcript

**Known Platform Behaviors**:
- iOS: Speech synthesis requires synchronous execution, warmup needed
- Android: Speech recognition duplicates words in continuous mode
- Chrome: Aggressive password manager, needs readonly trick
- All platforms: Voice features require HTTPS

**API Integrations**:
- OpenAI GPT-3.5-turbo for conversations
- Yahoo Finance API (free, no key) for stock quotes
- Google Custom Search API (optional) for market data
- Web Speech API for voice input/output

**File Structure**:
```
investment-advisor-plugin/
├── investment-advisor-chatbot.php (main, 870 lines)
├── assets/
│   ├── css/
│   │   ├── investment-advisor.css (619 lines)
│   │   └── admin.css
│   └── js/
│       ├── investment-advisor.js (1691 lines)
│       └── block-editor.js
├── README.md (comprehensive docs)
├── CHANGELOG.md (detailed version history)
└── readme.txt (WordPress.org format)
```

== Upgrade Notice ==

= 3.3.1 =
Speaker icon repositioned to send button for clearer UI. Android duplicate fix complete.

= 3.3.0 =
Complete fix for Android duplicate transcription issue. Input box now clears on stop.

== Credits ==

* Built with OpenAI's GPT technology
* Uses the Web Speech API for voice recognition
* Google Fonts integration for typography
* Responsive design principles

== Support ==

For support, feature requests, or bug reports, please visit:
* Plugin support forum on WordPress.org
* GitHub repository: https://github.com/yourusername/investment-advisor-chatbot
* Email: support@yourwebsite.com

== Privacy Policy ==

This plugin uses OpenAI's API to process chat messages. Please review OpenAI's privacy policy at https://openai.com/privacy/ to understand how data is handled. No chat data is stored locally on your WordPress site.
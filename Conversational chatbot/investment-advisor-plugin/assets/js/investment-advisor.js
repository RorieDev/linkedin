/**
 * Investment Advisor Chatbot JavaScript
 */

(function($) {
    'use strict';

    // Global variables
    let isRecording = false;
    let recognition = null;
    let currentWidget = null;
    let finalTranscript = '';
    let interimTranscript = '';
    let silenceTimer = null;
    let isProcessing = false;
    let speechSynthesis = window.speechSynthesis;
    let isSpeaking = false;
    let isCancelling = false; // Flag to prevent auto-send when cancelling
    let isVoiceInput = false; // Track if input came from microphone
    let abortController = null; // For canceling API requests
    let lastSpeechEndTime = 0; // Track when bot finished speaking to prevent echo
    let isRequestCancelled = false; // Track if current request was cancelled
    let lastBotResponse = ''; // Store the last bot response text
    let botResponseWords = new Set(); // Store unique words from bot responses
    let speakingPollInterval = null; // Interval for checking speaking state
    let availableVoices = []; // Store available voices globally
    let speechSynthesisWarmedUp = false; // Track if iOS speech engine is warmed up
    let isVoiceConversationActive = false; // Track if voice conversation has been initiated (stop button should stay visible)
    const riskAssessmentQuestions = [
        {
            key: 'goal',
            question: 'What is your primary investment goal? (e.g., grow wealth, generate income, preserve capital, fund a specific milestone)'
        },
        {
            key: 'horizon',
            question: 'What is your investment time horizon? (e.g., under 3 years, 3-5 years, 6-10 years, 10+ years)'
        },
        {
            key: 'volatility',
            question: 'How would you react if your portfolio dropped 15% in a short period? (e.g., stay invested, feel uneasy but stay, reduce risk, sell positions)'
        },
        {
            key: 'contribution',
            question: 'Roughly how much can you invest on a consistent (monthly/annual) basis?'
        },
        {
            key: 'constraints',
            question: 'Do you have any specific constraints or preferences? (e.g., ethical investing, liquidity needs, tax considerations)'
        }
    ];

    // Initialize when document is ready
    $(document).ready(function() {
        initializeChatbots();
        initializeSpeechRecognition();
        
        // Load voices for speech synthesis (important for iOS)
        if (speechSynthesis) {
            // iOS Safari requires voices to be loaded on user interaction
            // Load them immediately and also on voiceschanged event
            loadVoices();
            
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
        
        // iOS warmup - speak empty utterance on first user interaction
        // This prevents the first word from being cut off
        $(document).one('click touchstart', function() {
            warmUpSpeechSynthesis();
        });
        
        // Android fix: Periodic check to ensure speaking state is accurate
        // Some Android browsers don't fire onend reliably
        setInterval(function() {
            if (isSpeaking && !speechSynthesis.speaking) {
                console.log('[Speech] Android fix - forced cleanup of stuck speaking state');
                isSpeaking = false;
                if (currentWidget) {
                    currentWidget.find('.send-btn').removeClass('speaking');
                    
                    // CRITICAL: Keep stop button visible if voice conversation is active
                    if (isVoiceConversationActive) {
                        currentWidget.find('.stop-btn').addClass('active').show();
                        currentWidget.find('.send-btn').hide();
                    } else {
                        currentWidget.find('.stop-btn').removeClass('active').hide();
                        currentWidget.find('.send-btn').show();
                    }
                }
            }
        }, 500); // Check every 500ms
    });

    /**
     * Load and store available voices
     */
    function loadVoices() {
        availableVoices = speechSynthesis.getVoices();
        console.log('[Voices] Loaded', availableVoices.length, 'voices');
        
        // Log available voices for debugging
        if (availableVoices.length > 0) {
            console.log('[Voices] Available:', availableVoices.map(v => ({
                name: v.name,
                lang: v.lang,
                default: v.default
            })));
        }
    }

    /**
     * Get a specific voice by language code or voice name
     * @param {string} langOrName - Language code (e.g., 'en-GB') or voice name (e.g., 'Daniel')
     * @returns {SpeechSynthesisVoice|null}
     */
    function getVoice(langOrName) {
        if (!availableVoices || availableVoices.length === 0) {
            availableVoices = speechSynthesis.getVoices();
        }
        
        // First try to find by exact voice name
        let voice = availableVoices.find(v => v.name === langOrName);
        
        // If not found, try by language code
        if (!voice) {
            voice = availableVoices.find(v => v.lang === langOrName);
        }
        
        return voice || null;
    }

    /**
     * Get voices by language (supports partial matching)
     * @param {string} langCode - Language code (e.g., 'en', 'en-GB', 'en-US')
     * @returns {SpeechSynthesisVoice[]}
     */
    function getVoicesByLanguage(langCode) {
        if (!availableVoices || availableVoices.length === 0) {
            availableVoices = speechSynthesis.getVoices();
        }
        
        return availableVoices.filter(v => v.lang.startsWith(langCode));
    }

    /**
     * Warm up speech synthesis engine (iOS fix for first word being cut off)
     */
    function warmUpSpeechSynthesis() {
        if (speechSynthesisWarmedUp || !speechSynthesis) {
            return;
        }
        
        console.log('[Speech] Warming up speech synthesis engine');
        
        const warmupUtterance = new SpeechSynthesisUtterance('');
        warmupUtterance.volume = 0;
        
        warmupUtterance.onend = function() {
            speechSynthesisWarmedUp = true;
        };
        
        warmupUtterance.onerror = function() {
            speechSynthesisWarmedUp = true;
        };
        
        try {
            speechSynthesis.speak(warmupUtterance);
        } catch (e) {
            speechSynthesisWarmedUp = true;
        }
    }

    /**
     * Initialize all chatbot widgets on the page
     */
    function initializeChatbots() {
        $('.chatbot-widget').each(function() {
            const widget = $(this);
            const chatInput = widget.find('.chat-input');
            
            // Store the initial welcome message for later restoration
            const welcomeMessageContent = widget.find('.chat-messages .message.assistant').first().find('.message-content').html();
            widget.data('welcome-message', welcomeMessageContent);
            
            // Check if widget has API key from WordPress settings
            const hasApiKey = widget.data('has-api-key') === true || widget.data('has-api-key') === 'true';
            const widgetApiKey = widget.data('api-key');
            
            // If WordPress has API key, hide config panel and set the key
            if (hasApiKey && widgetApiKey) {
                widget.find('.config-panel').remove();
                widget.find('.config-btn').remove();
            }
            
            // Set up event listeners for this widget
            chatInput.on('keypress', function(e) {
                if (e.which === 13) { // Enter key
                    currentWidget = widget;
                    sendMessage();
                }
            });
            
            widget.find('.send-btn').on('click', function() {
                currentWidget = widget;
                sendMessage();
            });
            
            widget.find('.mic-btn').on('click', function() {
                currentWidget = widget;
                toggleRecording();
            });
            
            widget.find('.stop-btn').on('click', function() {
                currentWidget = widget;
                cancelRecording();
            });
            
            widget.find('.clear-chat-btn').on('click', function() {
                currentWidget = widget;
                clearConversation();
            });
            
            widget.find('.refresh-btn').on('click', function() {
                // Hard refresh the page
                location.reload(true);
            });
            
            widget.find('.config-btn').on('click', function() {
                currentWidget = widget;
                toggleConfig();
            });
            
            // Focus on input
            chatInput.focus();
        });
    }

    /**
     * Remove duplicate word patterns from transcription (Android fix)
     * Handles cases like "what is what is what is" -> "what is"
     */
    function removeDuplicatePatterns(text) {
        if (!text || text.trim().length === 0) return text;

        let words = text.trim().split(/\s+/);
        const maxPatternLength = 8;
        let changed = true;
        let iterations = 0;

        while (changed && iterations < 20) {
            iterations++;
            changed = false;

            const maxLen = Math.min(maxPatternLength, Math.floor(words.length / 2));

            outer: for (let patternLength = maxLen; patternLength >= 1; patternLength--) {
                for (let i = 0; i <= words.length - patternLength * 2; i++) {
                    let match = true;
                    for (let j = 0; j < patternLength; j++) {
                        if (words[i + j].toLowerCase() !== words[i + patternLength + j].toLowerCase()) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        words.splice(i + patternLength, patternLength);
                        changed = true;
                        break outer;
                    }
                }
            }
        }

        const cleaned = words.join(' ');
        console.log('[Duplicate Removal] Final:', cleaned);
        return cleaned;
    }

    /**
     * Initialize speech recognition
     */
    function initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            
            // Enable continuous listening and interim results
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US'; // Default to English, supports Arabic as well
            recognition.maxAlternatives = 1;
            
            recognition.onresult = function(event) {
                if (!currentWidget) return;
                
                // Don't process results if we're cancelling
                if (isCancelling) {
                    console.log('[Voice Input] Ignoring - cancelling in progress');
                    return;
                }
                
                // CRITICAL: Ignore recognition results if AI is currently speaking
                // This prevents the microphone from picking up the AI's voice output
                // BUT: Also check if speechSynthesis actually thinks it's speaking
                if (isSpeaking || speechSynthesis.speaking) {
                    console.log('[Voice Input] Ignoring - bot is speaking (isSpeaking:', isSpeaking, ', speechSynthesis.speaking:', speechSynthesis.speaking, ')');
                    return;
                }
                
                // CRITICAL: Ignore recognition for 3 seconds after bot finishes speaking
                // This prevents the microphone from picking up the tail end of the bot's speech
                const timeSinceSpeechEnd = Date.now() - lastSpeechEndTime;
                if (lastSpeechEndTime > 0 && timeSinceSpeechEnd < 3000) {
                    console.log('[Voice Input] Ignoring - too soon after bot speech (' + timeSinceSpeechEnd + 'ms)');
                    return;
                }
                
                interimTranscript = '';
                
                // Collect interim and final results
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    
                    if (event.results[i].isFinal) {
                        // Check if this transcript is bot-generated (echo of AI response)
                        const isBotEcho = isBotGeneratedText(transcript);
                        console.log('[Voice Input] Transcript:', transcript, 'Bot echo?', isBotEcho);
                        
                        if (isBotEcho) {
                            // This is the bot's own voice being recognized, ignore it
                            console.log('[Voice Input] IGNORED - Bot echo detected');
                            return;
                        }
                        
                        // CRITICAL: Ignore empty or whitespace-only transcripts
                        if (!transcript || transcript.trim().length === 0) {
                            console.log('[Voice Input] IGNORED - Empty transcript');
                            return;
                        }
                        
                        // Android fix: Clean duplicates from final transcript
                        const cleanedTranscript = removeDuplicatePatterns(transcript);
                        
                        finalTranscript += cleanedTranscript + ' ';
                        
                        // Clear any existing silence timer
                        if (silenceTimer) {
                            clearTimeout(silenceTimer);
                        }
                        
                        // Set a timer to auto-send after 1 second of silence
                        silenceTimer = setTimeout(function() {
                            if (finalTranscript.trim() && !isProcessing) {
                                autoSendMessage();
                            }
                        }, 1000);
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Android fix: Clean duplicates from display text as well
                const cleanFinal = removeDuplicatePatterns(finalTranscript);
                const cleanInterim = removeDuplicatePatterns(interimTranscript);
                const displayText = cleanFinal + cleanInterim;
                
                // Only write to input if bot is not speaking (prevents bot's voice from appearing in input)
                if (!isSpeaking) {
                    currentWidget.find('.chat-input').val(displayText);
                }
            };
            
            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    stopRecording();
                }
            };
            
            recognition.onend = function() {
                // Auto-restart if still in recording mode (unless manually stopped)
                if (isRecording && !isProcessing) {
                    try {
                        recognition.start();
                    } catch (e) {
                        // Silently handle restart prevention
                    }
                } else {
                    stopRecording();
                }
            };
        }
    }

    /**
     * Check if recognized text is bot-generated (echo of AI response)
     * Compares against the last bot response to filter out feedback
     */
    function isBotGeneratedText(transcript) {
        if (!lastBotResponse) {
            console.log('[Bot Echo Check] No previous bot response stored');
            return false;
        }
        
        // Normalize both strings for comparison (lowercase, trim)
        const normalizedTranscript = transcript.toLowerCase().trim();
        const normalizedBotResponse = lastBotResponse.toLowerCase().trim();
        
        console.log('[Bot Echo Check] Comparing:', {
            transcript: normalizedTranscript,
            lastBot: normalizedBotResponse.substring(0, 50) + '...'
        });
        
        // IMPORTANT: Check for user acknowledgment phrases first (these are NOT echoes)
        // These indicate the user is responding/acknowledging, not echoing
        const acknowledgmentPhrases = /\b(got it|okay|ok|thanks|thank you|sounds good|perfect|great|understood|i see|noted|alright)\b/i;
        if (acknowledgmentPhrases.test(normalizedTranscript)) {
            console.log('[Bot Echo Check] User acknowledgment detected - allowing through');
            return false;
        }
        
        // Check if transcript is a substring of bot response (partial match)
        if (normalizedBotResponse.includes(normalizedTranscript) && normalizedTranscript.length > 5) {
            console.log('[Bot Echo Check] MATCH - Transcript is substring of bot response');
            return true;
        }
        
        // Check if bot response is a substring of transcript
        if (normalizedTranscript.includes(normalizedBotResponse) && normalizedBotResponse.length > 5) {
            console.log('[Bot Echo Check] MATCH - Bot response is substring of transcript');
            return true;
        }
        
        // Check word overlap - if 60% or more words match (2+ chars), it's likely bot echo
        // Raised from 40% to 60% to reduce false positives when user repeats information
        const transcriptWords = normalizedTranscript.split(/\s+/).filter(w => w.length > 2);
        const botWords = normalizedBotResponse.split(/\s+/).filter(w => w.length > 2);
        
        let matchCount = 0;
        for (const word of transcriptWords) {
            if (botWords.includes(word)) {
                matchCount++;
            }
        }
        
        const matchPercentage = transcriptWords.length > 0 ? matchCount / transcriptWords.length : 0;
        console.log('[Bot Echo Check] Word overlap:', matchCount, '/', transcriptWords.length, '=', (matchPercentage * 100).toFixed(1) + '%');
        
        if (matchPercentage > 0.6) { // Raised to 60% to reduce false positives
            console.log('[Bot Echo Check] MATCH - High word overlap detected');
            return true;
        }
        
        // Special check: If transcript contains primarily date/time info and matches recent bot response timing
        // This catches cases like "Monday November 3rd 2025" after bot says "Today's date is Monday, November 3, 2025"
        const hasDateKeywords = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|2024|2025|2026)\b/i.test(normalizedTranscript);
        if (hasDateKeywords && matchCount >= 2) {
            console.log('[Bot Echo Check] MATCH - Date/time echo detected');
            return true;
        }
        
        console.log('[Bot Echo Check] NO MATCH - User speech detected');
        return false;
    }

    /**
     * Fix common trading vocabulary transcription errors
     * Speech recognition often transcribes "buy" as "by" and "sell" as "cell"
     */
    function fixTradingVocabulary(text) {
        if (!text) return text;
        
        // Common patterns to fix
        const fixes = [
            // "by" -> "buy" when followed by stock-related words
            { pattern: /\b(by)\s+((\d+\s+)?shares?\s+(of\s+)?)?([A-Z]{1,5}|tesla|apple|nvidia|microsoft|amazon|google|meta|netflix)\b/gi, 
              replacement: 'buy $2$5' },
            { pattern: /\b(by)\s+(\d+)\s+(share|shares)\b/gi, replacement: 'buy $2 $3' },
            { pattern: /\b(by)\s+(\d+)\b/gi, replacement: 'buy $2' },
            
            // "cell" -> "sell" when in trading context
            { pattern: /\b(cell)\s+((\d+\s+)?shares?\s+(of\s+)?)?([A-Z]{1,5}|tesla|apple|nvidia|microsoft|amazon|google|meta|netflix)\b/gi, 
              replacement: 'sell $2$5' },
            { pattern: /\b(cell)\s+(\d+)\s+(share|shares)\b/gi, replacement: 'sell $2 $3' },
            { pattern: /\b(cell)\s+(\d+)\b/gi, replacement: 'sell $2' },
            
            // Additional common errors
            { pattern: /\bsale\s+(of\s+)?/gi, replacement: 'sell ' },  // "sale" -> "sell"
            { pattern: /\bpurchase\b/gi, replacement: 'buy' },  // "purchase" -> "buy"
        ];
        
        let fixed = text;
        fixes.forEach(fix => {
            fixed = fixed.replace(fix.pattern, fix.replacement);
        });
        
        console.log('[Trading Vocab Fix]', 'Before:', text);
        console.log('[Trading Vocab Fix]', 'After:', fixed);
        
        return fixed;
    }

    /**
     * Auto-send message from voice input
     */
    async function autoSendMessage() {
        if (!currentWidget || isProcessing) return;
        
        // Android fix: Clean the entire finalTranscript before sending
        let message = removeDuplicatePatterns(finalTranscript.trim());
        
        // Fix common trading vocabulary transcription errors
        message = fixTradingVocabulary(message);
        
        if (!message) return;
        
        // Set processing flag to prevent multiple sends
        isProcessing = true;
        
        // Mark this as voice input
        isVoiceInput = true;
        
        // Clear the transcript
        finalTranscript = '';
        interimTranscript = '';
        
        // Get API key - first check WordPress settings, then localStorage
        let apiKey = currentWidget.data('api-key') || '';
        
        // If no API key from WordPress settings, try localStorage
        if (!apiKey) {
            apiKey = localStorage.getItem('investment_advisor_api_key') || '';
        }
        
        if (!apiKey) {
            showError(currentWidget, 'Please configure your API key first');
            const configPanel = currentWidget.find('.config-panel');
            if (configPanel.length > 0) {
                toggleConfig();
            } else {
                // If no config panel (WordPress managed), show admin message
                addMessage(currentWidget, 'Please ask your site administrator to configure the OpenAI API key in WordPress admin (Settings → Investment Advisor).', 'assistant');
            }
            isProcessing = false;
            return;
        }
        
        // Clear input
        currentWidget.find('.chat-input').val('');
        
        // Add user message to chat
        addMessage(currentWidget, message, 'user');
        
        // CRITICAL: Ensure stop button is visible during processing if voice conversation is active
        if (isVoiceConversationActive && currentWidget) {
            currentWidget.find('.stop-btn').addClass('active').show();
            currentWidget.find('.send-btn').hide();
            currentWidget.find('.mic-btn').hide();
        }
        
        // Show typing indicator
        showTypingIndicator(currentWidget);
        
        // Reset cancellation flag for new request
        isRequestCancelled = false;
        
        try {
            // Get current date to inject into system prompt
            const today = new Date();
            const currentDate = today.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: 'America/New_York' // Use explicit timezone to avoid date discrepancies
            });
            
            // Get system prompt from widget data or use default
            let systemPrompt = currentWidget.data('system-prompt') || 'You are an expert investment advisor. Provide professional, accurate financial guidance while being helpful and educational. Always remind users to consult with qualified financial professionals for personalized advice. If you cannot access real-time data, say "My real-time data access is unavailable at the moment" instead of "I don\'t have real-time data". Respond in the same language the user writes in (English or Arabic).';
            
            // CRITICAL: Add current date to system prompt
            systemPrompt = `IMPORTANT: Today's date is ${currentDate}. Use this date when answering questions about "today", "current", or time-related queries.\n\n` + systemPrompt;
            
            // Check for chart request first
            let enhancedMessage = message;
            const chartRequest = detectChartRequest(message);
            if (chartRequest) {
                console.log('[Chart Request - Voice] Detected chart request for:', chartRequest.symbol, 'range:', chartRequest.range);
                
                // Fetch chart data
                const chartData = await fetchChartData(chartRequest.symbol, chartRequest.range);
                
                if (chartData && chartData.dataPoints && chartData.dataPoints.length > 0) {
                    // Render chart immediately
                    renderChart(currentWidget, chartData);
                    
                    // Also get current price data for context
                    const financeData = await performYahooFinanceSearch(chartRequest.symbol);
                    if (financeData) {
                        const financeContext = formatYahooFinanceData(financeData, chartRequest.symbol);
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor. A price chart has been displayed showing ${chartRequest.symbol}'s price history over ${getRangeLabel(chartRequest.range)}. Use the chart data and current price information to provide insights about the stock's performance, trends, and what the chart reveals. Be conversational and reference specific observations from the chart. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = financeContext + '\nUser Question: ' + message;
                    } else {
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor. A price chart has been displayed showing ${chartRequest.symbol}'s price history over ${getRangeLabel(chartRequest.range)}. Analyze the chart and provide insights about the stock's performance and trends. Be conversational and reference what you see in the chart. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = 'Chart data for ' + chartRequest.symbol + ' (' + getRangeLabel(chartRequest.range) + ')\nUser Question: ' + message;
                    }
                } else {
                    // Chart data failed, fall through to normal processing
                    console.log('[Chart Request - Voice] Failed to fetch chart data, falling back to normal processing');
                }
            }
            
            // Check for stock symbol first (more specific than general search)
            const stockSymbol = extractStockSymbol(message);
            
            console.log('[Stock Detection - Voice] Extracted symbol:', stockSymbol, 'from query:', message);
            
            // Check if this is a historical query (mentions specific dates, "last week", etc)
            const isHistoricalQuery = /\b(last week|last month|yesterday|31st|30th|29th|28th|27th|26th|25th|january|february|march|april|may|june|july|august|september|october|november|december|on the|closing price|opened at|closed at)\b/i.test(message);
            
            // Only process stock symbol if we didn't already handle a chart request
            if (!chartRequest && stockSymbol) {
                // For historical queries, go straight to Google Search
                if (isHistoricalQuery) {
                    console.log('[Voice] Historical query detected, using Google Search for:', message);
                    const searchResults = await performGoogleSearch(message);
                    
                    if (searchResults && searchResults.length > 0) {
                        const searchContext = formatSearchResults(searchResults);
                        console.log('[Google Search - Voice] Got historical data');
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor with access to real-time market data. Use the information provided to answer questions directly and naturally. DO NOT mention "search results", "provided information", or "based on the data". Act as if you have direct knowledge of market conditions. Answer confidently using the data, citing specific numbers, percentages, or facts when relevant. If you cannot find the specific information requested, say "My real-time data access is unavailable at the moment" and suggest checking a financial website. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = searchContext + '\nUser Question: ' + message;
                    } else {
                        console.log('[Google Search - Voice] No data available for historical query');
                    }
                } else {
                    // For current price queries, try Yahoo Finance first
                    console.log('[Yahoo Finance - Voice] Fetching data for:', stockSymbol);
                    const financeData = await performYahooFinanceSearch(stockSymbol);
                    
                    console.log('[Yahoo Finance - Voice] Received data:', financeData);
                    
                    if (financeData) {
                        const financeContext = formatYahooFinanceData(financeData, stockSymbol);
                        console.log('[Yahoo Finance - Voice] Formatted context:', financeContext);
                        const marketStatusNote = financeData.isMarketOpen ? 'The market is currently OPEN and prices are updating in real-time.' : 'The market is currently CLOSED. Prices shown are from the last trading session.';
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor with access to comprehensive real-time stock market data. ${marketStatusNote} The data provided includes: current price, price change, percentage change, market status, trading volume, market cap, P/E ratio, EPS, dividend yield, beta, and 52-week range. Use ALL this information to provide a thorough, insightful analysis. Answer the user's question directly and naturally, referencing specific metrics when relevant. If they ask about historical timeframes (like "last week" or "last month"), explain that you have today's current data and suggest they check a financial website for detailed historical charts. Be conversational, insightful, and mention key financial metrics that are relevant to the discussion. DO NOT say "I don't have real-time data" when data is provided - use what you have. If you must mention data unavailability, say "My real-time data access is unavailable at the moment". Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = financeContext + '\nUser Question: ' + message;
                    } else {
                        // Yahoo Finance failed - try Google Search as fallback
                        console.log('[Yahoo Finance - Voice] Failed, falling back to Google Search for:', message);
                        const searchResults = await performGoogleSearch(message);
                        
                        if (searchResults && searchResults.length > 0) {
                            const searchContext = formatSearchResults(searchResults);
                            console.log('[Google Search - Voice] Got fallback results');
                            systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor with real-time market data access. Use the information provided to answer questions directly and naturally. DO NOT mention "search results", "provided information", or "based on the data". Act as if you have direct knowledge of current market conditions. Answer confidently using the data, citing specific numbers, percentages, or facts when relevant. If you cannot find the information, say "My real-time data access is unavailable at the moment". Respond in the same language the user writes in (English or Arabic).`;
                            enhancedMessage = searchContext + '\nUser Question: ' + message;
                        } else {
                            console.log('[Google Search - Voice] No fallback data available');
                        }
                    }
                }
            } else {
                // Fall back to Google Search for general market queries
                const needsSearch = await needsRealTimeInfo(message, apiKey);
                
                if (needsSearch) {
                    const searchResults = await performGoogleSearch(message);
                    
                    if (searchResults && searchResults.length > 0) {
                        const searchContext = formatSearchResults(searchResults);
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor with real-time market data access. Use the information provided to answer questions directly and naturally. DO NOT mention "search results", "provided information", or "based on the data". Act as if you have direct knowledge of current market conditions. Answer confidently using the data, citing specific numbers, percentages, or facts when relevant. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = searchContext + '\nUser Question: ' + message;
                    }
                }
            }
            
            // Call OpenAI API with enhanced message
            const response = await callOpenAI(apiKey, enhancedMessage, systemPrompt);
            
            // Check if request was cancelled while waiting
            if (isRequestCancelled) {
                isProcessing = false;
                isVoiceInput = false;
                hideTypingIndicator(currentWidget);
                return;
            }
            
            // Hide typing indicator
            hideTypingIndicator(currentWidget);
            
            // Double check cancellation before adding message
            if (isRequestCancelled) {
                isProcessing = false;
                isVoiceInput = false;
                return;
            }
            
            // Add assistant response
            addMessage(currentWidget, response, 'assistant');
            
            // Speak the response only if input came from voice
            if (isVoiceInput) {
                speakText(response);
            }
            
            // Reset flags
            isProcessing = false;
            isVoiceInput = false;
            
        } catch (error) {
            hideTypingIndicator(currentWidget);
            
            // Don't show error if request was cancelled
            if (isRequestCancelled) {
                isProcessing = false;
                isVoiceInput = false;
                return;
            }
            
            // Don't show error if request was aborted
            if (error.name === 'AbortError') {
                // Silently handle cancellation
            } else {
                const errorMsg = 'Sorry, I encountered an error while processing your request. Please check your API key and try again.';
                addMessage(currentWidget, errorMsg, 'assistant');
                if (isVoiceInput) {
                    speakText(errorMsg);
                }
                console.error('API Error:', error);
            }
            isProcessing = false;
            isVoiceInput = false;
        }
    }

    /**
     * Send message to the chatbot (manual/keyboard send)
     */
    async function sendMessage() {
        if (!currentWidget) return;
        
        const input = currentWidget.find('.chat-input');
        const message = input.val().trim();
        
        if (!message) return;
        
        // Get API key - first check WordPress settings, then localStorage
        let apiKey = currentWidget.data('api-key') || '';
        
        // If no API key from WordPress settings, try localStorage
        if (!apiKey) {
            apiKey = localStorage.getItem('investment_advisor_api_key') || '';
        }
        
        if (!apiKey) {
            showError(currentWidget, 'Please configure your API key first');
            const configPanel = currentWidget.find('.config-panel');
            if (configPanel.length > 0) {
                toggleConfig();
            } else {
                // If no config panel (WordPress managed), show admin message
                addMessage(currentWidget, 'Please ask your site administrator to configure the OpenAI API key in WordPress admin (Settings → Investment Advisor).', 'assistant');
            }
            return;
        }
        
        // Clear input
        input.val('');
        
        // Add user message to chat
        addMessage(currentWidget, message, 'user');
        
        // CRITICAL: Ensure stop button is visible during processing if voice conversation is active
        // (Note: For text input, voice conversation is not active, so this won't show stop button)
        
        // Show typing indicator
        showTypingIndicator(currentWidget);
        
        // Reset cancellation flag for new request
        isRequestCancelled = false;
        
        try {
            // Get current date for context
            const today = new Date();
            const currentDate = today.toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                timeZone: 'America/New_York' // Use explicit timezone to avoid date discrepancies
            });
            
            // Get system prompt from widget data or use default
            let systemPrompt = currentWidget.data('system-prompt') || 'You are an expert investment advisor. Provide professional, accurate financial guidance while being helpful and educational. Always remind users to consult with qualified financial professionals for personalized advice. If you cannot access real-time data, say "My real-time data access is unavailable at the moment" instead of "I don\'t have real-time data". Respond in the same language the user writes in (English or Arabic).';
            
            // Prepend current date to system prompt
            systemPrompt = `IMPORTANT: Today's date is ${currentDate}. Use this date when answering questions about "today", "current", or time-related queries.\n\n` + systemPrompt;
            
            // Check for chart request first
            let enhancedMessage = message;
            const chartRequest = detectChartRequest(message);
            if (chartRequest) {
                console.log('[Chart Request] Detected chart request for:', chartRequest.symbol, 'range:', chartRequest.range);
                
                // Fetch chart data
                const chartData = await fetchChartData(chartRequest.symbol, chartRequest.range);
                
                if (chartData && chartData.dataPoints && chartData.dataPoints.length > 0) {
                    // Render chart immediately
                    renderChart(currentWidget, chartData);
                    
                    // Also get current price data for context
                    const financeData = await performYahooFinanceSearch(chartRequest.symbol);
                    if (financeData) {
                        const financeContext = formatYahooFinanceData(financeData, chartRequest.symbol);
                        const marketStatusNote = financeData.isMarketOpen ? 'The market is currently OPEN and prices are updating in real-time.' : 'The market is currently CLOSED. Prices shown are from the last trading session.';
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor. A price chart has been displayed showing ${chartRequest.symbol}'s price history over ${getRangeLabel(chartRequest.range)}. ${marketStatusNote} Use the chart data and current price information to provide insights about the stock's performance, trends, and what the chart reveals. Be conversational and reference specific observations from the chart. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = financeContext + '\nUser Question: ' + message;
                    } else {
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor. A price chart has been displayed showing ${chartRequest.symbol}'s price history over ${getRangeLabel(chartRequest.range)}. Analyze the chart and provide insights about the stock's performance and trends. Be conversational and reference what you see in the chart. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = 'Chart data for ' + chartRequest.symbol + ' (' + getRangeLabel(chartRequest.range) + ')\nUser Question: ' + message;
                    }
                } else {
                    // Chart data failed, fall through to normal processing
                    console.log('[Chart Request] Failed to fetch chart data, falling back to normal processing');
                }
            }
            
            // Check for stock symbol first (more specific than general search)
            const stockSymbol = extractStockSymbol(message);
            
            console.log('[Stock Detection] Extracted symbol:', stockSymbol, 'from query:', message);
            
            // Check if this is a historical query (mentions specific dates, "last week", etc)
            const isHistoricalQuery = /\b(last week|last month|yesterday|31st|30th|29th|28th|27th|26th|25th|january|february|march|april|may|june|july|august|september|october|november|december|on the|closing price|opened at|closed at)\b/i.test(message);
            
            // Only process stock symbol if we didn't already handle a chart request
            if (!chartRequest && stockSymbol) {
                // For historical queries, go straight to Google Search
                if (isHistoricalQuery) {
                    console.log('[Text] Historical query detected, using Google Search for:', message);
                    const searchResults = await performGoogleSearch(message);
                    
                    if (searchResults && searchResults.length > 0) {
                        const searchContext = formatSearchResults(searchResults);
                        console.log('[Google Search] Got historical data');
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor with access to real-time market data. Use the information provided to answer questions directly and naturally. DO NOT mention "search results", "provided information", or "based on the data". Act as if you have direct knowledge of market conditions. Answer confidently using the data, citing specific numbers, percentages, or facts when relevant. If you cannot find the specific information requested, say "My real-time data access is unavailable at the moment" and suggest checking a financial website. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = searchContext + '\nUser Question: ' + message;
                    } else {
                        console.log('[Google Search] No data available for historical query');
                    }
                } else {
                    // For current price queries, try Yahoo Finance first
                    console.log('[Yahoo Finance] Fetching data for:', stockSymbol);
                    const financeData = await performYahooFinanceSearch(stockSymbol);
                    
                    console.log('[Yahoo Finance] Received data:', financeData);
                    
                    if (financeData) {
                        const financeContext = formatYahooFinanceData(financeData, stockSymbol);
                        console.log('[Yahoo Finance] Formatted context:', financeContext);
                        const marketStatusNote = financeData.isMarketOpen ? 'The market is currently OPEN and prices are updating in real-time.' : 'The market is currently CLOSED. Prices shown are from the last trading session.';
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor with access to comprehensive real-time stock market data. ${marketStatusNote} The data provided includes: current price, price change, percentage change, market status, trading volume, market cap, P/E ratio, EPS, dividend yield, beta, and 52-week range. Use ALL this information to provide a thorough, insightful analysis. Discuss price movements, financial metrics, and what they mean for investors. Be natural and conversational. DO NOT mention "provided data" or "according to the information". Act as if you are directly viewing live market data. Reference specific metrics (P/E ratio, market cap, volume, etc.) when they provide valuable context. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = financeContext + '\nUser Question: ' + message;
                    } else {
                        // Yahoo Finance failed - try Google Search as fallback
                        console.log('[Yahoo Finance] Failed, falling back to Google Search for:', message);
                        const searchResults = await performGoogleSearch(message);
                        
                        if (searchResults && searchResults.length > 0) {
                            const searchContext = formatSearchResults(searchResults);
                            console.log('[Google Search] Got fallback results');
                            systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor with real-time market data access. Use the information provided to answer questions directly and naturally. DO NOT mention "search results", "provided information", or "based on the data". Act as if you have direct knowledge of current market conditions. Answer confidently using the data, citing specific numbers, percentages, or facts when relevant. If you cannot find the information, say "My real-time data access is unavailable at the moment". Respond in the same language the user writes in (English or Arabic).`;
                            enhancedMessage = searchContext + '\nUser Question: ' + message;
                        } else {
                            console.log('[Google Search] No fallback data available');
                        }
                    }
                }
            } else {
                // Fall back to Google Search for general market queries
                const needsSearch = await needsRealTimeInfo(message, apiKey);
                
                if (needsSearch) {
                    const searchResults = await performGoogleSearch(message);
                    
                    if (searchResults && searchResults.length > 0) {
                        const searchContext = formatSearchResults(searchResults);
                        systemPrompt = `IMPORTANT: Today's date is ${currentDate}.\n\nYou are an expert investment advisor with real-time market data access. Use the information provided to answer questions directly and naturally. DO NOT mention "search results", "provided information", or "based on the data". Act as if you have direct knowledge of current market conditions. Answer confidently using the data, citing specific numbers, percentages, or facts when relevant. Respond in the same language the user writes in (English or Arabic).`;
                        enhancedMessage = searchContext + '\nUser Question: ' + message;
                    }
                }
            }
            
            // Call OpenAI API with enhanced message
            const response = await callOpenAI(apiKey, enhancedMessage, systemPrompt);
            
            // Check if request was cancelled while waiting
            if (isRequestCancelled) {
                hideTypingIndicator(currentWidget);
                return;
            }
            
            // Hide typing indicator
            hideTypingIndicator(currentWidget);
            
            // Double check cancellation before adding message
            if (isRequestCancelled) {
                return;
            }
            
            // Add assistant response
            addMessage(currentWidget, response, 'assistant');
            
            // Don't speak for manual text input
            
        } catch (error) {
            hideTypingIndicator(currentWidget);
            
            // Don't show error if request was cancelled
            if (isRequestCancelled) {
                return;
            }
            
            // Don't show error if request was aborted
            if (error.name === 'AbortError') {
                // Silently handle cancellation
            } else {
                const errorMsg = 'Sorry, I encountered an error while processing your request. Please check your API key and try again.';
                addMessage(currentWidget, errorMsg, 'assistant');
                console.error('API Error:', error);
            }
        }
    }

    /**
     * Call OpenAI API
     */
    async function callOpenAI(apiKey, userMessage, systemPrompt) {
        // Create new abort controller for this request
        abortController = new AbortController();
        
        // Enhance system prompt with trading context
        const enhancedSystemPrompt = systemPrompt + '\n\nIMPORTANT: You have access to an execute_trade function. When the user asks to buy or sell stocks (e.g., "buy 1 Tesla share", "sell 5 AAPL", "purchase 10 shares of NVDA"), use the execute_trade function. Common stock names and their tickers: Tesla=TSLA, Apple=AAPL, Microsoft=MSFT, Amazon=AMZN, Google/Alphabet=GOOG, Meta=META, NVIDIA=NVDA, Netflix=NFLX. Always confirm the exact action: BUY or SELL.';
        
        // Define available functions for OpenAI
        const functions = [
            {
                name: 'execute_trade',
                description: 'Execute a stock trade (buy or sell) via the Alpaca paper trading account. Use this when the user wants to buy or sell shares. Pay close attention to whether the user said BUY or SELL - these are different actions.',
                parameters: {
                    type: 'object',
                    properties: {
                        symbol: {
                            type: 'string',
                            description: 'The stock ticker symbol (e.g., TSLA, AAPL, NVDA). If user says company name like "Tesla" or "Apple", convert to ticker symbol.'
                        },
                        side: {
                            type: 'string',
                            enum: ['buy', 'sell'],
                            description: 'Whether to BUY or SELL the stock. CRITICAL: "buy"/"purchase" = buy, "sell" = sell. Double-check the user\'s intent.'
                        },
                        quantity: {
                            type: 'integer',
                            description: 'Number of shares to trade',
                            minimum: 1
                        }
                    },
                    required: ['symbol', 'side', 'quantity']
                }
            }
        ];
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: enhancedSystemPrompt
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                functions: functions,
                function_call: 'auto',
                max_tokens: 1000,
                temperature: 0.7
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const message = data.choices[0].message;
        
        // Check if OpenAI wants to call a function
        if (message.function_call) {
            const functionName = message.function_call.name;
            const functionArgs = JSON.parse(message.function_call.arguments);
            
            console.log('[Function Call]', functionName, functionArgs);
            
            if (functionName === 'execute_trade') {
                try {
                    // Execute the trade (includes user confirmation)
                    const result = await executeTrade(functionArgs.symbol, functionArgs.side, functionArgs.quantity);
                    
                    // Return detailed confirmation message
                    const status = result.status || 'submitted';
                    const orderId = result.id || 'unknown';
                    const action = functionArgs.side.toUpperCase();
                    const qty = functionArgs.quantity;
                    const sym = functionArgs.symbol;
                    
                    // Text version (displayed in chat)
                    const textResponse = `✅ Order ${status}!\n\n${action} ${qty} share${qty > 1 ? 's' : ''} of ${sym}\n\nOrder ID: ${orderId}\n\nYou can see the order details in the trading module below. The positions and account balance will update shortly.`;
                    
                    // Voice version (for speech output - simpler and cleaner)
                    const voiceResponse = `Order confirmed. ${action === 'BUY' ? 'Bought' : 'Sold'} ${qty} share${qty > 1 ? 's' : ''} of ${sym}. Your order has been ${status}.`;
                    
                    // Store both versions (voice version will be used by speakText via cleanTextForSpeech)
                    // For now, return the text version and let cleanTextForSpeech handle it
                    return textResponse;
                } catch (error) {
                    // Handle cancellation or errors
                    if (error.message.includes('cancelled')) {
                        return `Trade cancelled. No order was placed.`;
                    }
                    return `❌ Trade execution failed: ${error.message}\n\nPlease check the trading module status and try again.`;
                }
            }
        }
        
        return message.content;
    }
    
    /**
     * Execute a trade via the Alpaca trading module
     */
    async function executeTrade(symbol, side, quantity) {
        console.log('[Trade Execution] Requested:', { symbol, side, quantity });
        
        // Prepare confirmation message
        const action = side.toUpperCase();
        const confirmMessage = `${action} ${quantity} share${quantity > 1 ? 's' : ''} of ${symbol.toUpperCase()}`;
        
        let confirmed = false;
        
        // If this is voice input, ask for verbal confirmation
        if (isVoiceInput) {
            confirmed = await askVerbalConfirmation(confirmMessage);
        } else {
            // Text input - use standard confirm dialog
            confirmed = confirm(`Confirm: ${confirmMessage}?`);
        }
        
        if (!confirmed) {
            console.log('[Trade Execution] User declined');
            throw new Error('Trade cancelled by user');
        }
        
        // Get the proxy URL from the trading module
        const ORIGIN = window.location.origin || (window.location.protocol + "//" + window.location.host);
        const PROXY_URL = ORIGIN + "/wp-json/alpaca/v1";
        
        // Prepare order payload (same format as trading module)
        const payload = {
            symbol: symbol.toUpperCase(),
            side: side.toLowerCase(),
            type: 'market',
            time_in_force: 'day',
            qty: String(quantity)
        };
        
        console.log('[Trade Execution] Submitting order:', payload);
        
        try {
            // Submit order to Alpaca via WordPress proxy
            const response = await fetch(PROXY_URL + '/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                cache: 'no-store'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Order failed: HTTP ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('[Trade Execution] Order successful:', result);
            
            // Trigger UI updates in the trading module
            // Dispatch event for any listeners
            const tradeEvent = new CustomEvent('tamror:trade:complete', {
                detail: { symbol, side, quantity, result }
            });
            window.dispatchEvent(tradeEvent);
            
            // Flash the order card
            const placeCard = document.getElementById('placeCard');
            if (placeCard) {
                placeCard.classList.remove('flash');
                void placeCard.offsetWidth; // Force reflow
                placeCard.classList.add('flash');
            }
            
            // Trigger refresh of positions and orders tables
            setTimeout(() => {
                const refreshAccountBtn = document.getElementById('refreshAccount');
                const refreshPositionsBtn = document.getElementById('refreshPositions');
                const refreshOrdersBtn = document.getElementById('refreshOrders');
                
                if (refreshAccountBtn) refreshAccountBtn.click();
                if (refreshPositionsBtn) refreshPositionsBtn.click();
                if (refreshOrdersBtn) refreshOrdersBtn.click();
            }, 500);
            
            return result;
            
        } catch (error) {
            console.error('[Trade Execution] Error:', error);
            throw error;
        }
    }

    /**
     * Ask for verbal confirmation via voice
     */
    async function askVerbalConfirmation(message) {
        return new Promise((resolve) => {
            // CRITICAL: Stop the main recognition to prevent it from interfering
            // But DON'T change the UI state - keep the mic button visible
            const wasRecording = isRecording;
            if (isRecording && recognition) {
                try {
                    console.log('[Verbal Confirmation] Pausing main recognition...');
                    recognition.stop();
                    // Don't set isRecording = false - keep UI state
                } catch(e) {
                    console.error('[Verbal Confirmation] Error stopping main recognition:', e);
                }
            }
            
            // Speak the confirmation question
            const confirmText = `Are you sure you want to ${message}? Please say yes to confirm or no to cancel.`;
            
            const utterance = new SpeechSynthesisUtterance(confirmText);
            
            // Get voice preference from widget
            const voiceNameOrLang = currentWidget ? currentWidget.data('voice-name') : '';
            if (voiceNameOrLang) {
                const selectedVoice = getVoice(voiceNameOrLang);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    utterance.lang = selectedVoice.lang;
                }
            }
            
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // When speech ends, start listening for yes/no
            utterance.onend = function() {
                console.log('[Verbal Confirmation] Speech ended, preparing to listen...');
                
                // Check if recognition is available
                if (!recognition) {
                    console.error('[Verbal Confirmation] No speech recognition available');
                    speakText('Speech recognition not available. Trade cancelled.');
                    resolve(false);
                    return;
                }
                
                let confirmTranscript = '';
                let confirmTimeout;
                let hasResponded = false;
                
                const onConfirmResult = function(event) {
                    if (hasResponded) return;
                    
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            confirmTranscript = event.results[i][0].transcript.toLowerCase().trim();
                            console.log('[Verbal Confirmation] Heard:', confirmTranscript);
                            
                            // Check for affirmative responses
                            if (confirmTranscript.match(/\b(yes|yep|yeah|yup|sure|confirm|ok|okay|affirmative|correct|go ahead|do it)\b/)) {
                                hasResponded = true;
                                cleanup();
                                resolve(true);
                                return;
                            }
                            // Check for negative responses
                            else if (confirmTranscript.match(/\b(no|nope|nah|cancel|stop|don't|abort|negative)\b/)) {
                                hasResponded = true;
                                cleanup();
                                resolve(false);
                                return;
                            }
                        }
                    }
                };
                
                const cleanup = function() {
                    recognition.removeEventListener('result', onConfirmResult);
                    clearTimeout(confirmTimeout);
                    try {
                        recognition.stop();
                    } catch(e) {
                        // Ignore stop errors
                    }
                    
                    // Restart main recording if it was active before
                    if (wasRecording && currentWidget) {
                        // CRITICAL: Restore isRecording flag BEFORE restarting
                        isRecording = true;
                        
                        // Update UI to show stop button
                        currentWidget.find('.stop-btn').addClass('active').show();
                        currentWidget.find('.mic-btn').removeClass('recording').hide();
                        currentWidget.find('.send-btn').hide();
                        currentWidget.find('.listening-indicator').addClass('active');
                        
                        setTimeout(() => {
                            try {
                                console.log('[Verbal Confirmation] Resuming main recognition...');
                                recognition.start();
                                console.log('[Verbal Confirmation] isRecording restored to:', isRecording);
                            } catch(e) {
                                console.error('[Verbal Confirmation] Error restarting recognition:', e);
                            }
                        }, 500);
                    }
                };
                
                // Set up the listener BEFORE starting recognition
                recognition.addEventListener('result', onConfirmResult);
                
                // Wait longer (1 second) after speech ends to ensure everything is clear
                setTimeout(() => {
                    try {
                        recognition.start();
                        console.log('[Verbal Confirmation] Recognition started, waiting for response...');
                        
                        // Auto-cancel after 20 seconds of no response
                        confirmTimeout = setTimeout(() => {
                            if (hasResponded) return;
                            console.log('[Verbal Confirmation] Timeout - cancelling');
                            hasResponded = true;
                            cleanup();
                            speakText('No response received. Trade cancelled.');
                            resolve(false);
                        }, 20000);
                        
                    } catch (e) {
                        console.error('[Verbal Confirmation] Recognition start error:', e);
                        cleanup();
                        speakText('Unable to listen for confirmation. Trade cancelled.');
                        resolve(false);
                    }
                }, 1000); // Increased from 300ms to 1000ms
            };
            
            speechSynthesis.speak(utterance);
        });
    }

    /**
     * Detect if query needs real-time information using AI
     */
    async function needsRealTimeInfo(query, apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a classifier. Respond with only "YES" or "NO". Answer YES if the question asks about: current stock prices, recent market performance, today\'s prices, specific dates in 2024-2025, latest news, real-time data, or current events. Answer NO for: general investment advice, historical concepts, definitions, or strategies. Examples: "What is Tesla\'s price?" = YES, "Did NASDAQ go up last week?" = YES, "What is diversification?" = NO'
                        },
                        {
                            role: 'user',
                            content: query
                        }
                    ],
                    max_tokens: 5,
                    temperature: 0
                })
            });

            if (!response.ok) {
                return fallbackNeedsRealTimeInfo(query);
            }

            const data = await response.json();
            const answer = data.choices[0].message.content.trim().toUpperCase();
            const needsInfo = answer.includes('YES');
            
            return needsInfo;
            
        } catch (error) {
            console.error('[Real-time Detection] Error:', error);
            return fallbackNeedsRealTimeInfo(query);
        }
    }

    /**
     * Fallback detection if AI call fails
     * Enhanced detection for real-time data needs
     */
    function fallbackNeedsRealTimeInfo(query) {
        const lowerQuery = query.toLowerCase();
        
        // Keywords that indicate real-time information needs
        const realTimeKeywords = [
            'current', 'now', 'today', 'latest', 'recent', 'price', 'prices',
            'stock', 'stocks', 'market', 'markets', 'news', 'update', 'live', 'real-time',
            'what is', 'how much', 'what are', 'trading', 'quote', 'quotes', 'value', 'values',
            'did', 'does', 'is', 'are', 'was', 'were', 'has', 'have',
            'nasdaq', 'dow', 'sp500', 's&p', 's and p', 'dow jones',
            'went up', 'went down', 'go up', 'go down', 'rise', 'rose', 'fall', 'fell',
            'gain', 'gains', 'loss', 'losses', 'performance', 'perform',
            'percentage', 'percent', 'share price', 'stock price',
            'tesla', 'apple', 'microsoft', 'nvidia', 'amazon', 'google', 'meta',
            'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
            'index', 'indices', 'vix', 'volatility',
            'الآن', 'اليوم', 'حالياً', 'سعر', 'أسعار', 'سوق', 'أسواق', 'أخبار'
        ];
        
        // Market indices keywords
        const indexKeywords = [
            'sp500', 's&p 500', 'nasdaq', 'dow', 'dow jones', 'russell',
            'vix', 'volatility', 'ftse', 'nikkei', 'dax', 'cac', 'hang seng'
        ];
        
        // Check for stock symbols (uppercase letters, possibly with dash, 1-5 chars)
        const hasStockSymbol = /\b[A-Z]{1,5}(-USD)?\b/.test(query);
        
        // Check for index symbols (starts with ^)
        const hasIndexSymbol = /\^\w+/i.test(query);
        
        // Check for date patterns
        const hasDate = /\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}(st|nd|rd|th)?|2024|2025)\b/i.test(query);
        
        // Check for price-related questions
        const hasPriceQuestion = /(what is|how much|what are|what\'s|what's).*(price|value|worth|trading at)/i.test(query);
        
        // Check for market movement questions
        const hasMovementQuestion = /(did|does|is|are|was|were|has|have).*(up|down|rise|fall|gain|loss|change)/i.test(query);
        
        // Check for time-related keywords
        const hasTimeKeyword = /\b(today|now|current|latest|recent|yesterday|this week|this month)\b/i.test(query);
        
        const hasKeyword = realTimeKeywords.some(keyword => lowerQuery.includes(keyword));
        const hasIndexKeyword = indexKeywords.some(keyword => lowerQuery.includes(keyword));
        
        return hasKeyword || hasIndexKeyword || hasStockSymbol || hasIndexSymbol || hasDate || hasPriceQuestion || hasMovementQuestion || hasTimeKeyword;
    }

    /**
     * Perform Google search via WordPress AJAX
     */
    async function performGoogleSearch(query) {
        try {
            const formData = new FormData();
            formData.append('action', 'investment_advisor_google_search');
            formData.append('nonce', investmentAdvisorAjax.nonce);
            formData.append('query', query);
            
            const response = await fetch(investmentAdvisorAjax.ajax_url, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success && data.data.results) {
                return data.data.results;
            }
            
            return null;
        } catch (error) {
            console.error('[Google Search] Error:', error);
            return null;
        }
    }

    /**
     * Format search results for AI context
     */
    function formatSearchResults(results) {
        let formatted = 'REAL-TIME MARKET DATA:\n\n';
        results.forEach((result, index) => {
            // Clean up the snippet - remove truncation markers and extra whitespace
            let cleanSnippet = result.snippet
                .replace(/\.\.\./g, '')  // Remove ellipsis
                .replace(/\s+/g, ' ')     // Normalize whitespace
                .trim();
            
            formatted += `[${index + 1}] ${result.title}\n`;
            formatted += `${cleanSnippet}\n`;
            formatted += `Source: ${result.link}\n\n`;
        });
        formatted += '---\nAnswer the user\'s question using ONLY the factual data above (numbers, percentages, specific facts). Ignore any incomplete sentences or fragments.\n';
        return formatted;
    }
    
    /**
     * Perform Yahoo Finance lookup for stock data
     * @param {string} symbol - Stock symbol (e.g., AAPL, TSLA, BTC-USD)
     * @returns {Object|null} Financial data or null on error
     */
    async function performYahooFinanceSearch(symbol) {
        try {
            const formData = new FormData();
            formData.append('action', 'investment_advisor_yahoo_finance');
            formData.append('nonce', investmentAdvisorAjax.nonce);
            formData.append('symbol', symbol);
            
            const response = await fetch(investmentAdvisorAjax.ajax_url, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success && data.data.data) {
                return data.data.data;
            }
            
            return null;
        } catch (error) {
            console.error('[Yahoo Finance] Error:', error);
            return null;
        }
    }
    
    /**
     * Fetch historical chart data for a symbol
     * @param {string} symbol - Stock symbol
     * @param {string} range - Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
     * @param {string} interval - Data interval (1d, 1wk, 1mo, etc.)
     * @returns {Object|null} Chart data or null on error
     */
    async function fetchChartData(symbol, range = '1mo', interval = '1d') {
        try {
            const formData = new FormData();
            formData.append('action', 'investment_advisor_chart_data');
            formData.append('nonce', investmentAdvisorAjax.nonce);
            formData.append('symbol', symbol);
            formData.append('range', range);
            formData.append('interval', interval);
            
            const response = await fetch(investmentAdvisorAjax.ajax_url, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success && data.data.data) {
                return data.data.data;
            }
            
            return null;
        } catch (error) {
            console.error('[Chart Data] Error:', error);
            return null;
        }
    }
    
    /**
     * Detect if user is asking for a chart
     * @param {string} query - User's question
     * @returns {Object|null} Object with symbol and range, or null
     */
    function detectChartRequest(query) {
        const lowerQuery = query.toLowerCase();
        
        // Keywords that indicate chart request
        const chartKeywords = [
            'chart', 'graph', 'plot', 'visualize', 'show me', 'display',
            'price chart', 'stock chart', 'historical', 'trend', 'performance chart',
            'over time', 'time series', 'price history', 'price movement'
        ];
        
        const hasChartKeyword = chartKeywords.some(keyword => lowerQuery.includes(keyword));
        
        if (!hasChartKeyword) {
            return null;
        }
        
        // Extract symbol
        const symbol = extractStockSymbol(query);
        if (!symbol) {
            return null;
        }
        
        // Extract time range
        let range = '1mo'; // Default: 1 month
        
        if (lowerQuery.includes('last week') || lowerQuery.includes('past week') || lowerQuery.includes('week')) {
            range = '5d';
        } else if (lowerQuery.includes('last month') || lowerQuery.includes('past month') || lowerQuery.includes('month')) {
            range = '1mo';
        } else if (lowerQuery.includes('3 months') || lowerQuery.includes('quarter')) {
            range = '3mo';
        } else if (lowerQuery.includes('6 months') || lowerQuery.includes('half year')) {
            range = '6mo';
        } else if (lowerQuery.includes('year') || lowerQuery.includes('1 year')) {
            range = '1y';
        } else if (lowerQuery.includes('2 years')) {
            range = '2y';
        } else if (lowerQuery.includes('5 years')) {
            range = '5y';
        } else if (lowerQuery.includes('10 years')) {
            range = '10y';
        } else if (lowerQuery.includes('all time') || lowerQuery.includes('max')) {
            range = 'max';
        } else if (lowerQuery.includes('today') || lowerQuery.includes('day')) {
            range = '1d';
        }
        
        return { symbol, range };
    }
    
    /**
     * Render a price chart in the chat
     * @param {Object} widget - Chatbot widget element
     * @param {Object} chartData - Chart data from API
     */
    function renderChart(widget, chartData) {
        if (!chartData || !chartData.dataPoints || chartData.dataPoints.length === 0) {
            console.error('[Chart] No data points available');
            return;
        }
        
        // Create chart container
        const chartId = 'chart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const chartContainer = `
            <div class="stock-chart-container" style="margin: 15px 0; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <div style="margin-bottom: 10px; font-weight: 600; color: #333;">
                    ${chartData.name || chartData.symbol} - ${getRangeLabel(chartData.range)}
                </div>
                <canvas id="${chartId}" style="max-width: 100%; height: 300px;"></canvas>
            </div>
        `;
        
        // Add chart container to the last assistant message
        const messagesContainer = widget.find('.chat-messages');
        const lastMessage = messagesContainer.find('.message.assistant').last();
        
        if (lastMessage.length) {
            lastMessage.find('.message-content').append(chartContainer);
        } else {
            // If no assistant message, create one
            addMessage(widget, chartContainer, 'assistant');
        }
        
        // Wait for DOM to update, then render chart
        setTimeout(() => {
            const canvas = document.getElementById(chartId);
            if (!canvas || typeof Chart === 'undefined') {
                console.error('[Chart] Canvas or Chart.js not available');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Prepare data
            const labels = chartData.dataPoints.map(point => {
                const date = new Date(point.timestamp * 1000);
                if (chartData.range === '1d' || chartData.range === '5d') {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                } else {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: chartData.range.includes('y') ? 'numeric' : undefined });
                }
            });
            
            const prices = chartData.dataPoints.map(point => point.price);
            const currency = chartData.currency || 'USD';
            
            // Determine color based on price trend
            const firstPrice = prices[0];
            const lastPrice = prices[prices.length - 1];
            const isPositive = lastPrice >= firstPrice;
            const chartColor = isPositive ? '#10b981' : '#ef4444'; // Green for up, red for down
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Price (' + currency + ')',
                        data: prices,
                        borderColor: chartColor,
                        backgroundColor: chartColor + '20',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return currency + ' ' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            ticks: {
                                callback: function(value) {
                                    return currency + ' ' + value.toFixed(2);
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                maxTicksLimit: 10
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
        }, 100);
    }
    
    /**
     * Get human-readable label for time range
     * @param {string} range - Time range code
     * @returns {string} Human-readable label
     */
    function getRangeLabel(range) {
        const labels = {
            '1d': '1 Day',
            '5d': '5 Days',
            '1mo': '1 Month',
            '3mo': '3 Months',
            '6mo': '6 Months',
            '1y': '1 Year',
            '2y': '2 Years',
            '5y': '5 Years',
            '10y': '10 Years',
            'ytd': 'Year to Date',
            'max': 'All Time'
        };
        return labels[range] || range;
    }
    
    /**
     * Extract stock symbol from user query
     * @param {string} query - User's question
     * @returns {string|null} Stock symbol or null
     */
    function extractStockSymbol(query) {
        // Map company names to stock symbols
        const companyToSymbol = {
            'tesla': 'TSLA',
            'apple': 'AAPL',
            'microsoft': 'MSFT',
            'google': 'GOOGL',
            'alphabet': 'GOOGL',
            'amazon': 'AMZN',
            'meta': 'META',
            'facebook': 'META',
            'nvidia': 'NVDA',
            'amd': 'AMD',
            'intel': 'INTC',
            'netflix': 'NFLX',
            'disney': 'DIS',
            'boeing': 'BA',
            'general electric': 'GE',
            'ford': 'F',
            'general motors': 'GM',
            'gm': 'GM',
            'at&t': 'T',
            'verizon': 'VZ',
            'jpmorgan': 'JPM',
            'jp morgan': 'JPM',
            'bank of america': 'BAC',
            'wells fargo': 'WFC',
            'citigroup': 'C',
            'goldman sachs': 'GS',
            'morgan stanley': 'MS',
            'visa': 'V',
            'mastercard': 'MA',
            'paypal': 'PYPL',
            'square': 'SQ',
            'coinbase': 'COIN',
            'shopify': 'SHOP',
            'uber': 'UBER',
            'lyft': 'LYFT',
            'airbnb': 'ABNB',
            'doordash': 'DASH',
            'robinhood': 'HOOD',
            'rivian': 'RIVN',
            'lucid': 'LCID',
            'nio': 'NIO',
            'xpeng': 'XPEV',
            'li auto': 'LI',
            'alibaba': 'BABA',
            'jd.com': 'JD',
            'jd': 'JD',
            'pinduoduo': 'PDD',
            'tencent': 'TCEHY',
            'tsmc': 'TSM',
            'taiwan semiconductor': 'TSM',
            'sony': 'SONY',
            'toyota': 'TM',
            'honda': 'HMC',
            'sap': 'SAP',
            'asml': 'ASML',
            'bitcoin': 'BTC-USD',
            'ethereum': 'ETH-USD',
            'dogecoin': 'DOGE-USD',
            'cardano': 'ADA-USD',
            'solana': 'SOL-USD',
            'polygon': 'MATIC-USD',
            'polkadot': 'DOT-USD',
            'chainlink': 'LINK-USD',
            'uniswap': 'UNI-USD',
            'avalanche': 'AVAX-USD',
            // Market Indices
            'sp500': '^GSPC',
            's&p 500': '^GSPC',
            's&p500': '^GSPC',
            'sp 500': '^GSPC',
            'nasdaq': '^IXIC',
            'nasdaq composite': '^IXIC',
            'dow': '^DJI',
            'dow jones': '^DJI',
            'dow jones industrial average': '^DJI',
            'djia': '^DJI',
            'russell 2000': '^RUT',
            'russell': '^RUT',
            'vix': '^VIX',
            'volatility index': '^VIX',
            'ftse 100': '^FTSE',
            'ftse': '^FTSE',
            'nikkei': '^N225',
            'nikkei 225': '^N225',
            'dax': '^GDAXI',
            'cac 40': '^FCHI',
            'hang seng': '^HSI',
            'shanghai composite': '^SSEC',
            'asx 200': '^AXJO'
        };
        
        const lowerQuery = query.toLowerCase();
        
        // Check for company names first
        for (const [company, symbol] of Object.entries(companyToSymbol)) {
            if (lowerQuery.includes(company)) {
                console.log(`[Symbol Extraction] Found company name "${company}" -> ${symbol}`);
                return symbol;
            }
        }
        
        // Common patterns for stock queries
        const patterns = [
            /\b([A-Z]{1,5})\s+stock/i,           // "AAPL stock"
            /\$([A-Z]{1,5})\b/,                  // "$AAPL"
            /\^([A-Z]{1,5})\b/,                  // "^GSPC" for indices
            /\b(AAPL|TSLA|MSFT|GOOGL|AMZN|META|NVDA|AMD|INTC|NFLX|DIS|BA|GE|F|GM|T|VZ|JPM|BAC|WFC|C|GS|MS|V|MA|PYPL|SQ|COIN|SHOP|UBER|LYFT|ABNB|DASH|HOOD|RIVN|LCID|NIO|XPEV|LI|BABA|JD|PDD|TCEHY|TSM|SONY|TM|HMC|SAP|ASML|BTC-USD|ETH-USD|DOGE-USD|ADA-USD|SOL-USD|MATIC-USD|DOT-USD|LINK-USD|UNI-USD|AVAX-USD|GSPC|IXIC|DJI|RUT|VIX|FTSE|N225|GDAXI|FCHI|HSI|SSEC|AXJO)\b/i  // Popular symbols and indices
        ];
        
        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match) {
                let extractedSymbol = match[1].toUpperCase();
                // If it's an index pattern (starts with ^), add the ^ prefix
                if (pattern.source.includes('\\^') && !extractedSymbol.startsWith('^')) {
                    // Check if it's a known index
                    const indexSymbols = ['GSPC', 'IXIC', 'DJI', 'RUT', 'VIX', 'FTSE', 'N225', 'GDAXI', 'FCHI', 'HSI', 'SSEC', 'AXJO'];
                    if (indexSymbols.includes(extractedSymbol)) {
                        extractedSymbol = '^' + extractedSymbol;
                    }
                }
                console.log(`[Symbol Extraction] Found symbol pattern: ${extractedSymbol}`);
                return extractedSymbol;
            }
        }
        
        console.log('[Symbol Extraction] No symbol found in query');
        return null;
    }
    
    /**
     * Format Yahoo Finance data for AI
     * @param {Object} data - Financial data from Yahoo Finance
     * @param {string} symbol - Stock symbol
     * @returns {string} Formatted string for AI
     */
    function formatYahooFinanceData(data, symbol) {
        let formatted = `REAL-TIME STOCK DATA FOR ${data.symbol || symbol}:\n\n`;
        formatted += `Company: ${data.name || symbol}\n`;
        formatted += `Exchange: ${data.exchange || 'Unknown'}\n`;
        
        // Market Status
        if (data.isMarketOpen !== undefined) {
            formatted += `Market Status: ${data.isMarketOpen ? 'OPEN' : 'CLOSED'}\n`;
        }
        
        // Price Information
        if (data.currentPrice !== null && data.currentPrice !== undefined) {
            const currency = data.currency || 'USD';
            formatted += `Current Price: ${currency} ${data.currentPrice.toFixed(2)}\n`;
        }
        
        if (data.openPrice !== null && data.openPrice !== undefined) {
            formatted += `Open Price: ${data.currency || 'USD'} ${data.openPrice.toFixed(2)}\n`;
        }
        
        if (data.change !== null && data.change !== undefined && data.changePercent !== null && data.changePercent !== undefined) {
            const direction = data.change >= 0 ? '+' : '';
            formatted += `Change: ${direction}${data.change.toFixed(2)} (${direction}${data.changePercent.toFixed(2)}%)\n`;
        }
        
        if (data.previousClose !== null && data.previousClose !== undefined) {
            formatted += `Previous Close: ${data.currency || 'USD'} ${data.previousClose.toFixed(2)}\n`;
        }
        
        // Day Range
        if (data.dayHigh !== null && data.dayHigh !== undefined && data.dayLow !== null && data.dayLow !== undefined) {
            formatted += `Day Range: ${data.currency || 'USD'} ${data.dayLow.toFixed(2)} - ${data.currency || 'USD'} ${data.dayHigh.toFixed(2)}\n`;
        }
        
        // 52 Week Range
        if (data.fiftyTwoWeekHigh !== null && data.fiftyTwoWeekHigh !== undefined && data.fiftyTwoWeekLow !== null && data.fiftyTwoWeekLow !== undefined) {
            formatted += `52 Week Range: ${data.currency || 'USD'} ${data.fiftyTwoWeekLow.toFixed(2)} - ${data.currency || 'USD'} ${data.fiftyTwoWeekHigh.toFixed(2)}\n`;
        }
        
        // Volume
        if (data.volume !== null && data.volume !== undefined) {
            formatted += `Volume: ${data.volume.toLocaleString()}\n`;
        }
        
        if (data.avgVolume !== null && data.avgVolume !== undefined) {
            formatted += `Average Volume: ${data.avgVolume.toLocaleString()}\n`;
        }
        
        // Market Cap
        if (data.marketCap !== null && data.marketCap !== undefined) {
            if (data.marketCap >= 1000000000) {
                const marketCapBillions = (data.marketCap / 1000000000).toFixed(2);
                formatted += `Market Cap: ${data.currency || 'USD'} ${marketCapBillions}B\n`;
            } else if (data.marketCap >= 1000000) {
                const marketCapMillions = (data.marketCap / 1000000).toFixed(2);
                formatted += `Market Cap: ${data.currency || 'USD'} ${marketCapMillions}M\n`;
            } else {
                formatted += `Market Cap: ${data.currency || 'USD'} ${data.marketCap.toLocaleString()}\n`;
            }
        }
        
        // Financial Metrics
        if (data.peRatio !== null && data.peRatio !== undefined) {
            formatted += `P/E Ratio: ${data.peRatio.toFixed(2)}\n`;
        }
        
        if (data.eps !== null && data.eps !== undefined) {
            formatted += `EPS (Earnings Per Share): ${data.currency || 'USD'} ${data.eps.toFixed(2)}\n`;
        }
        
        if (data.dividendYield !== null && data.dividendYield !== undefined) {
            formatted += `Dividend Yield: ${(data.dividendYield * 100).toFixed(2)}%\n`;
        }
        
        if (data.beta !== null && data.beta !== undefined) {
            formatted += `Beta: ${data.beta.toFixed(2)}\n`;
        }
        
        // Last Update
        if (data.lastUpdate) {
            formatted += `Last Update: ${data.lastUpdate}\n`;
        }
        
        formatted += '\n---\nProvide a comprehensive, natural analysis of this stock using ALL the data above. Include: current price, price change and percentage, market status (open/closed), key financial metrics (P/E ratio, market cap, volume), and any notable information. Be conversational and insightful. If the market is closed, mention that prices shown are from the last trading session.\n';
        return formatted;
    }

    /**
     * Add message to chat
     */
    function addMessage(widget, content, sender) {
        const messagesContainer = widget.find('.chat-messages');
        const messageHtml = `
            <div class="message ${sender}">
                <div class="message-content">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
            </div>
        `;
        
        messagesContainer.append(messageHtml);
        
        // Scroll to bottom
        messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
    }

    /**
     * Show typing indicator
     */
    function showTypingIndicator(widget) {
        widget.find('.typing-indicator').addClass('active');
        const messagesContainer = widget.find('.chat-messages');
        messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
    }

    /**
     * Hide typing indicator
     */
    function hideTypingIndicator(widget) {
        widget.find('.typing-indicator').removeClass('active');
    }

    /**
     * Toggle recording
     */
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    /**
     * Start recording
     */
    async function startRecording() {
        if (recognition && currentWidget) {
            // Warm up speech synthesis for iOS (prevents first word cutoff)
            warmUpSpeechSynthesis();
            
            // Stop any ongoing speech first (interrupt if AI is speaking)
            window.stopSpeaking();
            
            // Wait a moment for audio to settle
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Reset transcripts
            finalTranscript = '';
            interimTranscript = '';
            isProcessing = false;
            
            // CRITICAL: Mark voice conversation as active - stop button will stay visible
            isVoiceConversationActive = true;
            console.log('[Voice Conversation] Started - stop button will remain visible');
            
            isRecording = true;
            currentWidget.find('.mic-btn').addClass('recording');
            currentWidget.find('.listening-indicator').addClass('active');
            currentWidget.find('.stop-btn').addClass('active').show();
            currentWidget.find('.mic-btn').hide();
            
            try {
                recognition.start();
            } catch (e) {
                // Silently handle already started
            }
        } else {
            alert('Speech recognition is not supported in your browser.');
        }
    }

    /**
     * Cancel recording (via stop button) - stops everything
     */
    window.cancelRecording = function() {
        if (currentWidget) {
            // Set cancellation flag FIRST to prevent any pending responses
            isRequestCancelled = true;
            
            // Stop any speaking
            window.stopSpeaking();
            
            // Abort any ongoing API request
            if (abortController) {
                abortController.abort();
                abortController = null;
            }
            
            // Hide typing indicator
            hideTypingIndicator(currentWidget);
            
            // Reset processing flag
            isProcessing = false;
            isVoiceInput = false;
            
            // CRITICAL: End voice conversation - this is the ONLY place we hide the stop button
            isVoiceConversationActive = false;
            console.log('[Voice Conversation] Ended by user - hiding stop button');
            
            isCancelling = true; // Set flag to prevent auto-send
            stopRecording();
            
            // Clear the input field multiple times to ensure it sticks
            const inputField = currentWidget.find('.chat-input');
            inputField.val('');
            setTimeout(() => inputField.val(''), 10);
            setTimeout(() => inputField.val(''), 50);
            setTimeout(() => inputField.val(''), 100);
            
            isCancelling = false; // Reset flag
            
            // FORCE hide stop button and speaker indicator (only when explicitly cancelled)
            currentWidget.find('.stop-btn').removeClass('active').hide();
            currentWidget.find('.send-btn').removeClass('speaking');
            currentWidget.find('.send-btn').show();
            currentWidget.find('.mic-btn').show();
            currentWidget.find('.listening-indicator').removeClass('active');
        }
    };

    /**
     * Stop recording (internal function - does NOT end voice conversation)
     */
    function stopRecording() {
        if (recognition && isRecording) {
            isRecording = false;
            $('.mic-btn').removeClass('recording');
            
            if (currentWidget) {
                currentWidget.find('.listening-indicator').removeClass('active');
                
                // CRITICAL: Only hide stop button if voice conversation is not active
                // If voice conversation is active, keep stop button visible
                if (!isVoiceConversationActive) {
                    currentWidget.find('.stop-btn').removeClass('active').hide();
                    currentWidget.find('.mic-btn').show();
                } else {
                    // Voice conversation is still active - keep stop button visible
                    console.log('[Stop Recording] Voice conversation active - keeping stop button visible');
                    currentWidget.find('.stop-btn').addClass('active').show();
                    currentWidget.find('.mic-btn').hide();
                }
            }
            
            // Clear any pending silence timers
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }
            
            try {
                recognition.stop();
            } catch (e) {
                // Silently handle already stopped
            }
            
            // Send any remaining transcript (unless cancelled via stop button)
            if (finalTranscript.trim() && !isProcessing && !isCancelling) {
                autoSendMessage();
            }
            
            // Reset transcripts
            finalTranscript = '';
            interimTranscript = '';
        }
    }

    /**
     * Clean text for speech output
     * Removes emojis, order IDs, technical details, and formats for natural speech
     */
    function cleanTextForSpeech(text) {
        if (!text) return '';
        
        let cleaned = text;
        
        // Remove emoji checkmarks and symbols
        cleaned = cleaned.replace(/[✅❌✓✗☑️]/g, '');
        
        // Remove "Order ID: xyz123..." lines
        cleaned = cleaned.replace(/Order ID:\s*[a-zA-Z0-9\-]+/gi, '');
        
        // Remove markdown formatting
        cleaned = cleaned.replace(/[*_~`#]/g, '');
        
        // Convert multiple newlines to single space
        cleaned = cleaned.replace(/\n+/g, ' ');
        
        // Remove "You can see..." informational text
        cleaned = cleaned.replace(/You can see (the )?(order details|details|the order) in the trading module.*?(\.|$)/gi, '');
        cleaned = cleaned.replace(/The positions and account balance will update.*?(\.|$)/gi, '');
        
        // Simplify common phrases for voice
        cleaned = cleaned.replace(/Order submitted!/gi, 'Order confirmed.');
        cleaned = cleaned.replace(/Trade execution failed:/gi, 'Trade failed.');
        
        // Clean up multiple spaces
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        // Trim
        cleaned = cleaned.trim();
        
        console.log('[Speech Cleanup] Original:', text.substring(0, 100));
        console.log('[Speech Cleanup] Cleaned:', cleaned);
        
        return cleaned;
    }

    /**
     * Speak text using Web Speech API
     */
    function speakText(text) {
        // Stop any currently speaking text
        if (isSpeaking) {
            speechSynthesis.cancel();
        }
        
        if (!text || !speechSynthesis) return;
        
        // Store this response as bot-generated text (for echo detection)
        lastBotResponse = text;
        console.log('[Bot Response] Stored for echo detection:', text.substring(0, 100) + '...');
        
        // Clean text for better speech output
        let cleanText = cleanTextForSpeech(text);
        
        // iOS Safari fix: Add double comma for slightly longer pause (prevents first word cutoff)
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            cleanText = ', , ' + cleanText;
        }
        
        // Critical: Cancel any previous speech
        speechSynthesis.cancel();
        
        // Create utterance immediately - iOS requires synchronous call
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // iOS-friendly settings
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-GB'; // Default to British English
        
        // Set voice if available - but don't wait for it
        // Refresh voices list if empty
        if (!availableVoices || availableVoices.length === 0) {
            availableVoices = speechSynthesis.getVoices();
        }
        
        if (availableVoices && availableVoices.length > 0) {
            // Get configured voice from widget data
            const configuredVoiceName = currentWidget ? currentWidget.data('voice-name') : '';
            const configuredVoiceLang = currentWidget ? currentWidget.data('voice-lang') : '';
            let selectedVoice = null;
            
            // Priority 1: Try configured voice name (e.g., 'Daniel', 'Samantha')
            if (configuredVoiceName) {
                selectedVoice = getVoice(configuredVoiceName);
                console.log('[Voice] Using configured voice:', configuredVoiceName, selectedVoice ? '✓' : '✗');
            }
            
            // Priority 2: Try configured language (e.g., 'en-GB', 'en-US')
            if (!selectedVoice && configuredVoiceLang) {
                selectedVoice = getVoice(configuredVoiceLang);
                console.log('[Voice] Using configured language:', configuredVoiceLang, selectedVoice ? '✓' : '✗');
            }
            
            // Priority 3: Default to British English
            if (!selectedVoice) {
                // Try to find Daniel (common British male voice)
                selectedVoice = getVoice('Daniel');
                
                // Try any British English voice
                if (!selectedVoice) {
                    selectedVoice = getVoice('en-GB');
                }
                
                // Try common UK voices (Karen, Serena, Kate)
                if (!selectedVoice) {
                    const ukVoices = ['Karen', 'Serena', 'Kate', 'Oliver', 'Arthur'];
                    for (const voiceName of ukVoices) {
                        selectedVoice = getVoice(voiceName);
                        if (selectedVoice) break;
                    }
                }
                
                // Fallback: any UK English voice
                if (!selectedVoice) {
                    const ukVoices = getVoicesByLanguage('en-GB');
                    if (ukVoices.length > 0) {
                        selectedVoice = ukVoices[0];
                    }
                }
                
                // Last resort: any English voice (not Australian preferably)
                if (!selectedVoice) {
                    selectedVoice = availableVoices.find(voice => 
                        voice.lang.startsWith('en') && !voice.lang.includes('AU')
                    );
                }
                
                console.log('[Voice] Using default voice:', selectedVoice ? selectedVoice.name : 'none');
            }
            
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang;
                console.log('[Voice] Selected:', selectedVoice.name, '(' + selectedVoice.lang + ')');
            }
        }
        
        // Event handlers
        utterance.onstart = function() {
            console.log('[Speech] Speech started');
            isSpeaking = true;
            
            // Temporarily stop speech recognition to prevent feedback loop
            if (isRecording && recognition) {
                try {
                    recognition.stop();
                } catch (e) {
                    // Silently handle if already stopped
                }
            }
            
            if (currentWidget) {
                currentWidget.find('.send-btn').addClass('speaking');
                // CRITICAL: Always show stop button if voice conversation is active
                if (isVoiceConversationActive) {
                    currentWidget.find('.stop-btn').addClass('active').show();
                    currentWidget.find('.send-btn').hide();
                }
            }
        };
        
        utterance.onend = function() {
            console.log('[Speech] Speech ended - cleaning up state');
            
            // CRITICAL: Immediately clear speaking flag for Android
            isSpeaking = false;
            
            // Clear polling interval if it exists
            if (speakingPollInterval) {
                clearInterval(speakingPollInterval);
                speakingPollInterval = null;
            }
            
            // Force cancel to ensure clean state
            speechSynthesis.cancel();
            
            // Record the time when AI finished speaking
            if (typeof lastSpeechEndTime !== 'undefined') {
                lastSpeechEndTime = Date.now();
            }
            
            // Update UI - but keep stop button active if voice conversation is active
            if (currentWidget) {
                currentWidget.find('.send-btn').removeClass('speaking');
                
                console.log('[Speech] Speech ended - isRecording:', isRecording, 'isVoiceConversationActive:', isVoiceConversationActive);
                
                // CRITICAL: Always keep stop button visible if voice conversation is active
                if (isVoiceConversationActive) {
                    console.log('[Speech] VOICE CONVERSATION ACTIVE - Keeping stop button visible');
                    // Force these states explicitly - stop button must stay visible
                    currentWidget.find('.stop-btn').addClass('active').show();
                    currentWidget.find('.mic-btn').hide();
                    currentWidget.find('.send-btn').hide();
                    
                    // Show listening indicator if recording, otherwise just show stop button
                    if (isRecording) {
                        currentWidget.find('.listening-indicator').addClass('active');
                        currentWidget.find('.mic-btn').removeClass('recording');
                    } else {
                        currentWidget.find('.listening-indicator').removeClass('active');
                    }
                } else {
                    console.log('[Speech] Voice conversation not active - normal UI state');
                    // Only hide stop button if voice conversation is not active
                    currentWidget.find('.stop-btn').removeClass('active').hide();
                    currentWidget.find('.send-btn').show();
                    currentWidget.find('.listening-indicator').removeClass('active');
                    currentWidget.find('.mic-btn').show();
                }
            }
            
            // Force a final check that speaking is truly off
            setTimeout(function() {
                if (!speechSynthesis.speaking) {
                    isSpeaking = false;
                    console.log('[Speech] Final confirmation - speech stopped');
                }
            }, 50);
            
            // Restart speech recognition if microphone was active
            if (isRecording && recognition) {
                // Very short delay for iOS, immediate for Android
                const restartDelay = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 150 : 50;
                
                setTimeout(function() {
                    try {
                        console.log('[Speech] Restarting recognition after speech end');
                        recognition.start();
                    } catch (e) {
                        // Silently handle if already started
                        console.log('[Speech] Recognition already active or error restarting:', e.message);
                    }
                }, restartDelay);
            }
        };
        
        utterance.onerror = function(event) {
            console.error('Speech error:', event.error);
            isSpeaking = false;
            
            // Clear polling interval if it exists
            if (speakingPollInterval) {
                clearInterval(speakingPollInterval);
                speakingPollInterval = null;
            }
            
            // Record the time even on error (for cooldown period)
            lastSpeechEndTime = Date.now();
            
            // DON'T clear transcripts on error - user might already be speaking
            // Only clear if there's no active user input
            
            // Restart speech recognition on error if microphone was active
            if (isRecording && recognition) {
                try {
                    recognition.start();
                } catch (e) {
                    // Silently handle if already started
                    console.log('[Speech] Recognition already active or error restarting:', e.message);
                }
            }
            
            if (currentWidget) {
                currentWidget.find('.send-btn').removeClass('speaking');
                
                // CRITICAL: Keep stop button visible if voice conversation is active
                if (isVoiceConversationActive) {
                    currentWidget.find('.stop-btn').addClass('active').show();
                    currentWidget.find('.send-btn').hide();
                } else {
                    currentWidget.find('.stop-btn').removeClass('active').hide();
                    currentWidget.find('.send-btn').show();
                }
            }
        };
        
        // CRITICAL FOR iOS: Speak must be called synchronously in the same execution context
        // Any async operations or timeouts will break iOS Safari
        speechSynthesis.speak(utterance);
        
        // Clear any existing polling interval
        if (speakingPollInterval) {
            clearInterval(speakingPollInterval);
        }
        
        // Add polling to ensure speaking state is properly cleared (iOS Safari fallback)
        // Check every 500ms if speechSynthesis claims to be done but isSpeaking is still true
        speakingPollInterval = setInterval(function() {
            if (isSpeaking && !speechSynthesis.speaking) {
                console.log('[Speech] Detected stale speaking state, forcing cleanup');
                clearInterval(speakingPollInterval);
                speakingPollInterval = null;
                isSpeaking = false;
                speechSynthesis.cancel();
                
                if (currentWidget) {
                    currentWidget.find('.send-btn').removeClass('speaking');
                    
                    // CRITICAL: Keep stop button visible if voice conversation is active
                    if (isVoiceConversationActive) {
                        currentWidget.find('.stop-btn').addClass('active').show();
                        currentWidget.find('.send-btn').hide();
                    } else {
                        currentWidget.find('.stop-btn').removeClass('active').hide();
                        currentWidget.find('.send-btn').show();
                    }
                }
                
                // Restart recognition if needed
                if (isRecording && recognition) {
                    try {
                        console.log('[Speech] Restarting recognition after stale state cleanup');
                        recognition.start();
                    } catch (e) {
                        console.log('[Speech] Recognition restart error:', e.message);
                    }
                }
            }
            
            // Clear interval if not speaking
            if (!isSpeaking) {
                clearInterval(speakingPollInterval);
                speakingPollInterval = null;
            }
        }, 500);
        
        // Failsafe: clear interval after 30 seconds
        setTimeout(function() {
            if (speakingPollInterval) {
                clearInterval(speakingPollInterval);
                speakingPollInterval = null;
            }
        }, 30000);
    }
    

    /**
     * Stop speaking immediately
     */
    window.stopSpeaking = function() {
        // Clear polling interval
        if (speakingPollInterval) {
            clearInterval(speakingPollInterval);
            speakingPollInterval = null;
        }
        
        // ALWAYS cancel and cleanup, regardless of isSpeaking flag state
        if (speechSynthesis) {
            speechSynthesis.cancel();
        }
        
        isSpeaking = false;
        
        // ALWAYS update UI and clear input
        if (currentWidget) {
            currentWidget.find('.send-btn').removeClass('speaking');
            
            // CRITICAL: Keep stop button visible if voice conversation is active
            if (isVoiceConversationActive) {
                currentWidget.find('.stop-btn').addClass('active').show();
                currentWidget.find('.send-btn').hide();
            } else {
                currentWidget.find('.stop-btn').removeClass('active').hide();
                currentWidget.find('.send-btn').show();
            }
            
            // Clear the input field when stopping bot speech
            currentWidget.find('.chat-input').val('');
        }
        
        console.log('[Speech] stopSpeaking called - forced cleanup');
    };

    /**
     * Toggle configuration panel
     */
    window.toggleConfig = function() {
        const panel = $('#configPanel');
        panel.toggleClass('active');
    };

    /**
     * Clear conversation
     */
    window.clearConversation = function() {
        if (!currentWidget) {
            currentWidget = $('.chatbot-widget').first();
        }
        
        if (currentWidget) {
            // Stop any ongoing speech
            window.stopSpeaking();
            
            // Reset voice conversation state (user cleared conversation)
            isVoiceConversationActive = false;
            console.log('[Voice Conversation] Cleared by user - resetting state');
            
            // Get the messages container
            const messagesContainer = currentWidget.find('.chat-messages');
            
            // Get the stored welcome message
            const welcomeMessageContent = currentWidget.data('welcome-message');
            
            // Clear all messages
            messagesContainer.empty();
            
            // Re-add welcome message
            if (welcomeMessageContent) {
                messagesContainer.append(`
                    <div class="message assistant">
                        <div class="message-content">${welcomeMessageContent}</div>
                    </div>
                `);
            }
            
            // Reset UI to default state
            currentWidget.find('.stop-btn').removeClass('active').hide();
            currentWidget.find('.send-btn').show();
            currentWidget.find('.mic-btn').show();
            currentWidget.find('.listening-indicator').removeClass('active');
        }
    };

    /**
     * Save configuration
     */
    window.saveConfig = function() {
        const apiKeyValue = $('#apiKeyInput').val();
        
        if (!apiKeyValue.trim()) {
            showError(null, 'API key is required');
            return;
        }
        
        // Save to localStorage
        localStorage.setItem('investment_advisor_api_key', apiKeyValue);
        
        // Update all widgets
        $('.chatbot-widget').data('api-key', apiKeyValue);
        
        toggleConfig();
        clearError();
    };

    /**
     * Show error message
     */
    function showError(widget, message) {
        $('#errorMessage').text(message);
    }

    /**
     * Clear error message
     */
    function clearError() {
        $('#errorMessage').text('');
    }

    /**
     * Handle keyboard input (global function for inline handlers)
     */
    window.handleKeyPress = function(event) {
        if (event.key === 'Enter') {
            currentWidget = $(event.target).closest('.chatbot-widget');
            sendMessage();
        }
    };

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Load saved API key on initialization (only for widgets without WordPress API key)
    $(document).ready(function() {
        $('.chatbot-widget').each(function() {
            const widget = $(this);
            const hasWordPressApiKey = widget.data('has-api-key') === true || widget.data('has-api-key') === 'true';
            
            // Only load from localStorage if WordPress doesn't have an API key
            if (!hasWordPressApiKey) {
                const savedApiKey = localStorage.getItem('investment_advisor_api_key');
                if (savedApiKey) {
                    widget.find('#apiKeyInput').val(savedApiKey);
                    widget.data('api-key', savedApiKey);
                }
            }
        });
    });

    // Expose functions globally for inline onclick handlers
    window.toggleRecording = toggleRecording;
    window.clearConversation = clearConversation;
    window.toggleConfig = toggleConfig;
    window.saveApiKey = saveApiKey;
    window.sendMessage = sendMessage;

    // Expose voice helper functions for testing in console
    window.listVoices = function() {
        if (!availableVoices || availableVoices.length === 0) {
            availableVoices = speechSynthesis.getVoices();
        }
        
        console.log('Available Voices (' + availableVoices.length + '):');
        console.table(availableVoices.map(v => ({
            name: v.name,
            lang: v.lang,
            default: v.default ? '✓' : '',
            localService: v.localService ? '✓' : ''
        })));
        
        return availableVoices;
    };

    window.testVoice = function(voiceNameOrLang, testText = "Hello, this is a test of the speech synthesis system.") {
        const voice = getVoice(voiceNameOrLang);
        
        if (!voice) {
            console.error('Voice not found:', voiceNameOrLang);
            console.log('Use listVoices() to see available voices');
            return;
        }
        
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = function() {
            console.log('[Test Voice] Speaking:', voice.name, '(' + voice.lang + ')');
        };
        
        utterance.onend = function() {
            console.log('[Test Voice] Finished');
        };
        
        utterance.onerror = function(event) {
            console.error('[Test Voice] Error:', event.error);
        };
        
        speechSynthesis.speak(utterance);
        console.log('Testing voice:', voice.name, '(' + voice.lang + ')');
    };

    window.setVoice = function(voiceNameOrLang) {
        const voice = getVoice(voiceNameOrLang);
        
        if (!voice) {
            console.error('Voice not found:', voiceNameOrLang);
            console.log('Use listVoices() to see available voices');
            return;
        }
        
        if (currentWidget) {
            currentWidget.data('voice-name', voice.name);
            currentWidget.data('voice-lang', voice.lang);
            console.log('Voice set to:', voice.name, '(' + voice.lang + ')');
            console.log('This voice will be used for the next response');
        } else {
            console.warn('No active chatbot widget. Click on a chatbot first.');
        }
    };

    window.getVoicesByLanguage = function(langCode) {
        const voices = getVoicesByLanguage(langCode);
        console.log('Voices for', langCode + ':', voices.length);
        console.table(voices.map(v => ({
            name: v.name,
            lang: v.lang,
            default: v.default ? '✓' : ''
        })));
        return voices;
    };

    // Log helper functions on console
    console.log('%c💬 Investment Advisor Voice Commands:', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
    console.log('%clistVoices()', 'color: #2196F3; font-weight: bold;', '- List all available voices');
    console.log('%ctestVoice("Daniel")', 'color: #2196F3; font-weight: bold;', '- Test a specific voice by name');
    console.log('%ctestVoice("en-GB")', 'color: #2196F3; font-weight: bold;', '- Test a voice by language code');
    console.log('%csetVoice("Daniel")', 'color: #2196F3; font-weight: bold;', '- Set the chatbot to use a specific voice');
    console.log('%cgetVoicesByLanguage("en-GB")', 'color: #2196F3; font-weight: bold;', '- Get all voices for a language');

    function detectRiskAssessmentRequest(query) {
        if (!query) return false;
        const lower = query.toLowerCase();
        const triggers = [
            'understand my risk appetite',
            'understand my risk tolerance',
            'understand my investment goals',
            'understand my risk profile',
            'risk questionnaire',
            'risk profiling',
            'help me find my risk level',
            'help me understand my risk appetite'
        ];
        return triggers.some(trigger => lower.includes(trigger));
    }

    function startRiskAssessment(widget) {
        const state = {
            active: true,
            currentQuestionIndex: 0,
            answers: {},
            isVoice: isVoiceInput
        };
        widget.data('riskState', state);
        addMessage(widget, "Sure — let's understand your risk appetite and investment goals. I'll ask a few quick questions.", 'assistant');
        askNextRiskQuestion(widget);
    }

    function askNextRiskQuestion(widget) {
        const state = widget.data('riskState');
        if (!state || !state.active) {
            return;
        }
        if (state.currentQuestionIndex >= riskAssessmentQuestions.length) {
            completeRiskAssessment(widget);
            return;
        }
        const question = riskAssessmentQuestions[state.currentQuestionIndex];
        addMessage(widget, question.question, 'assistant');
    }

    function handleRiskAssessmentAnswer(widget, answer, options = {}) {
        const state = widget.data('riskState');
        if (!state || !state.active) {
            return false;
        }

        const currentQuestion = riskAssessmentQuestions[state.currentQuestionIndex];
        state.answers[currentQuestion.key] = answer.trim();
        state.currentQuestionIndex += 1;
        widget.data('riskState', state);

        if (state.currentQuestionIndex < riskAssessmentQuestions.length) {
            askNextRiskQuestion(widget);
        } else {
            completeRiskAssessment(widget, options);
        }

        return true;
    }

    function buildRiskProfileSummary(answers) {
        const lines = [];
        if (answers.goal) lines.push(`Primary goal: ${answers.goal}`);
        if (answers.horizon) lines.push(`Time horizon: ${answers.horizon}`);
        if (answers.volatility) lines.push(`Volatility comfort: ${answers.volatility}`);
        if (answers.contribution) lines.push(`Ongoing contribution: ${answers.contribution}`);
        if (answers.constraints) lines.push(`Constraints/preferences: ${answers.constraints}`);
        return lines.join('\n');
    }

    async function completeRiskAssessment(widget, options = {}) {
        const state = widget.data('riskState');
        if (!state) {
            return;
        }

        state.active = false;
        widget.data('riskState', state);

        const summary = buildRiskProfileSummary(state.answers);
        widget.data('riskProfileSummary', summary);

        addMessage(widget, `Thanks — here's what I captured:\n${summary}\nLet me suggest an investment approach tailored to this profile.`, 'assistant');

        await generateRiskProfileRecommendations(widget, summary, options);
    }

    async function generateRiskProfileRecommendations(widget, summary, options = {}) {
        // Determine API key - first check WordPress settings, then localStorage
        let apiKey = widget.data('api-key') || '';

        if (!apiKey) {
            apiKey = localStorage.getItem('investment_advisor_api_key') || '';
        }

        if (!apiKey) {
            showError(widget, 'Please configure your API key first');
            const configPanel = widget.find('.config-panel');
            if (configPanel.length > 0) {
                toggleConfig();
            } else {
                addMessage(widget, 'Please ask your site administrator to configure the OpenAI API key in WordPress admin (Settings → Investment Advisor).', 'assistant');
            }
            return;
        }

        showTypingIndicator(widget);
        isProcessing = true;
        isRequestCancelled = false;

        try {
            const today = new Date();
            const currentDate = today.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York'
            });

            let systemPrompt = `IMPORTANT: Today's date is ${currentDate}. You are an expert investment advisor. Based on the client's risk profile summary, recommend suitable investment strategies, asset allocations, and next steps. Tailor recommendations to the stated time horizon, volatility comfort, goals, and constraints. Provide clear reasoning, diversification guidance, and risk management reminders. Respond in the same language the client uses.`;

            const userMessage = `Risk profile summary:\n${summary}\n\nPlease provide a concise set of investment recommendations (asset allocation ideas, product categories, next steps) appropriate for this profile.`;

            const response = await callOpenAI(apiKey, userMessage, systemPrompt);

            if (isRequestCancelled) {
                hideTypingIndicator(widget);
                isProcessing = false;
                return;
            }

            hideTypingIndicator(widget);
            addMessage(widget, response, 'assistant');
        } catch (error) {
            hideTypingIndicator(widget);
            const errorMsg = 'Sorry, I encountered an error while generating your personalized plan. Please try again in a moment.';
            addMessage(widget, errorMsg, 'assistant');
            console.error('[Risk Assessment] Error:', error);
        }

        isProcessing = false;
    }

})(jQuery);
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import './thermomix-chatbot.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are an expert Thermomix cooking assistant with deep knowledge of Thermomix TM5 and TM6 models. You help users with:
- Recipes and cooking techniques
- Temperature settings (Varoma, steaming, sous vide)
- Speed settings (1-10, reverse, soft)
- Cooking times and methods
- Troubleshooting common issues
- Adapting recipes for Thermomix
- Cleaning and maintenance tips

You provide clear, step-by-step instructions and can help adapt recipes for Thermomix. You're friendly, patient, and always helpful. Respond in the same language the user writes in.`;

export default function ThermomixChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your Thermomix assistant. How can I help you today? You can ask me about recipes, cooking techniques, settings, or anything Thermomix-related!',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceConversationActive, setIsVoiceConversationActive] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null); // SpeechRecognition type varies by browser
  const speechSynthesisRef = useRef<typeof window.speechSynthesis | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechEndTimeRef = useRef(0);
  const availableVoicesRef = useRef<any[]>([]);
  const speechSynthesisWarmedUpRef = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesisRef.current = window.speechSynthesis;

      // Load voices
      const loadVoices = () => {
        if (speechSynthesisRef.current) {
          availableVoicesRef.current = speechSynthesisRef.current.getVoices();
          console.log('[Voices] Loaded', availableVoicesRef.current.length, 'voices');
        }
      };

      loadVoices();
      if (speechSynthesisRef.current.onvoiceschanged !== undefined) {
        speechSynthesisRef.current.onvoiceschanged = loadVoices;
      }

      // Initialize speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: any) => {
          if (isSpeaking || speechSynthesisRef.current?.speaking) {
            return;
          }

          const timeSinceSpeechEnd = Date.now() - lastSpeechEndTimeRef.current;
          if (lastSpeechEndTimeRef.current > 0 && timeSinceSpeechEnd < 3000) {
            return;
          }

          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              if (transcript.trim()) {
                const cleaned = removeDuplicatePatterns(transcript);
                finalTranscriptRef.current += cleaned + ' ';
                if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                }
                silenceTimerRef.current = setTimeout(() => {
                  if (finalTranscriptRef.current.trim() && !isProcessing) {
                    handleAutoSend(finalTranscriptRef.current.trim());
                  }
                }, 1000);
              }
            } else {
              interim += transcript;
            }
          }

          const cleanFinal = removeDuplicatePatterns(finalTranscriptRef.current);
          const cleanInterim = removeDuplicatePatterns(interim);
          setInterimTranscript(cleanInterim);
          if (inputRef.current && !isSpeaking) {
            inputRef.current.value = cleanFinal + cleanInterim;
            setInputValue(cleanFinal + cleanInterim);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            stopRecording();
          }
        };

        recognitionRef.current.onend = () => {
          if (isRecording && !isProcessing) {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              // Silently handle restart prevention
            }
          } else {
            stopRecording();
          }
        };
      }

      // iOS warmup
      const warmUp = () => {
        if (speechSynthesisWarmedUpRef.current || !speechSynthesisRef.current) return;
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        utterance.onend = () => {
          speechSynthesisWarmedUpRef.current = true;
        };
        try {
          speechSynthesisRef.current.speak(utterance);
        } catch (e) {
          speechSynthesisWarmedUpRef.current = true;
        }
      };

      document.addEventListener('click', warmUp, { once: true });
      document.addEventListener('touchstart', warmUp, { once: true });

      // Android fix: Periodic check for stuck speaking state
      const interval = setInterval(() => {
        if (isSpeaking && speechSynthesisRef.current && !speechSynthesisRef.current.speaking) {
          setIsSpeaking(false);
        }
      }, 500);

      return () => {
        clearInterval(interval);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };
    }
  }, [isRecording, isProcessing, isSpeaking]);

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('thermomix_chatbot_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Remove duplicate patterns (Android fix)
  const removeDuplicatePatterns = (text: string): string => {
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

    return words.join(' ');
  };

  // Get voice by language
  const getVoice = (langOrName: string): any => {
    if (availableVoicesRef.current.length === 0) {
      availableVoicesRef.current = speechSynthesisRef.current?.getVoices() || [];
    }
    let voice = availableVoicesRef.current.find((v) => v.name === langOrName);
    if (!voice) {
      voice = availableVoicesRef.current.find((v) => v.lang === langOrName);
    }
    return voice || null;
  };

  // Speak text
  const speakText = useCallback((text: string) => {
    if (!speechSynthesisRef.current) return;

    speechSynthesisRef.current.cancel();
    setIsSpeaking(true);

    // Detect language from text (simple heuristic)
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const lang = isArabic ? 'ar-SA' : 'en-GB';

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getVoice(lang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = lang;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      lastSpeechEndTimeRef.current = Date.now();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      lastSpeechEndTimeRef.current = Date.now();
    };

    try {
      speechSynthesisRef.current.speak(utterance);
    } catch (e) {
      setIsSpeaking(false);
    }
  }, []);

  // Call OpenAI API
  const callOpenAI = async (message: string, conversationHistory: Message[] = []): Promise<string> => {
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        systemPrompt: SYSTEM_PROMPT,
        conversationHistory: conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        // Include API key if available (for client-side usage)
        ...(apiKey ? { apiKey } : {}),
      }),
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get response');
    }

    const data = await response.json();
    return data.response;
  };

  // Handle auto-send from voice
  const handleAutoSend = async (message: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    finalTranscriptRef.current = '';
    setInterimTranscript('');

    if (inputRef.current) {
      inputRef.current.value = '';
      setInputValue('');
    }

    // Add user message
    const userMessage: Message = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await callOpenAI(message, [...messages, userMessage]);
      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages((prev) => [...prev, assistantMessage]);

      if (isVoiceConversationActive) {
        speakText(response);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errorMsg = 'Sorry, I encountered an error. Please try again.';
        setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
        if (isVoiceConversationActive) {
          speakText(errorMsg);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Send message (text input)
  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const message = inputValue.trim();
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    const userMessage: Message = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const response = await callOpenAI(message, [...messages, userMessage]);
      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Start recording
  const startRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    setIsRecording(true);
    setIsVoiceConversationActive(true);
    finalTranscriptRef.current = '';
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsRecording(false);
    if (inputRef.current) {
      inputRef.current.value = '';
      setInputValue('');
    }
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  };

  // Cancel recording and stop everything
  const cancelRecording = () => {
    stopRecording();
    setIsVoiceConversationActive(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    setIsSpeaking(false);
    setIsProcessing(false);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m your Thermomix assistant. How can I help you today? You can ask me about recipes, cooking techniques, settings, or anything Thermomix-related!',
      },
    ]);
    cancelRecording();
  };

  // Save API key
  const saveApiKey = () => {
    if (apiKey) {
      localStorage.setItem('thermomix_chatbot_api_key', apiKey);
      setShowConfig(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="thermomix-chatbot-container">
      <div className="chatbot-widget">
        <div className="chatbot-header">
          <h3>Thermomix Assistant</h3>
          <button className="clear-chat-btn" onClick={clearConversation} title="Clear conversation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
          </button>
          {!apiKey && (
            <button className="config-btn" onClick={() => setShowConfig(!showConfig)} title="Settings">
              ⚙️
            </button>
          )}
        </div>

        {showConfig && (
          <div className="config-panel active">
            <label className="config-label">OpenAI API Key</label>
            <input
              type="password"
              className="api-key-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <div className="config-actions">
              <button className="config-save" onClick={saveApiKey}>
                Save
              </button>
              <button className="config-cancel" onClick={() => setShowConfig(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          {isProcessing && (
            <div className="typing-indicator active">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <div className="input-row">
            {isRecording && (
              <div className="listening-indicator active">
                <svg className="listening-mic-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              className={`chat-input ${isRecording ? 'listening' : ''}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isRecording ? 'Listening...' : 'Type your message...'}
              readOnly={isRecording}
            />
            {isVoiceConversationActive && !isRecording && !isProcessing ? (
              <button className="stop-btn active" onClick={cancelRecording} title="Stop">
                <svg className="stop-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>
            ) : isRecording ? (
              <button className="mic-btn recording" onClick={toggleRecording} title="Stop recording">
                <svg className="mic-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            ) : (
              <>
                <button className="mic-btn" onClick={toggleRecording} title="Voice input">
                  <svg className="mic-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </button>
                <button className="send-btn" onClick={handleSend} title="Send">
                  <svg className="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


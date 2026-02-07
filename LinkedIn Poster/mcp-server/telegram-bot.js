import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import { JSDOM } from 'jsdom';

export function initTelegramBot(supabase, tokens, openai) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not set - Telegram bot disabled');
    return null;
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('✅ Telegram bot initialized');

  // Store pending posts awaiting confirmation
  const pendingPosts = {};

  // Helper: Get LinkedIn member ID for Telegram user
  async function getMemberIdForTelegram(telegramId) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('telegram_users')
        .select('member_id')
        .eq('telegram_id', telegramId)
        .eq('active', true)
        .single();

      if (error) return null;
      return data?.member_id;
    } catch (err) {
      return null;
    }
  }

  // Helper: Update last_used timestamp
  async function updateLastUsed(telegramId) {
    if (!supabase) return;
    try {
      await supabase
        .from('telegram_users')
        .update({ last_used: new Date().toISOString() })
        .eq('telegram_id', telegramId);
    } catch (err) {
      console.error('Failed to update last_used:', err.message);
    }
  }

  // Helper: Fetch and extract text from URL
  async function fetchArticleContent(url) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Extract main content
      let text = '';

      // Try to get article content
      const article = document.querySelector('article') ||
                     document.querySelector('main') ||
                     document.querySelector('[role="main"]') ||
                     document.body;

      // Remove script and style elements
      article.querySelectorAll('script, style, nav, footer').forEach(el => el.remove());

      // Get text content
      text = article.textContent
        .trim()
        .split('\n')
        .filter(line => line.trim().length > 0)
        .join(' ')
        .replace(/\s+/g, ' ')
        .substring(0, 2000); // Limit to 2000 chars for context

      return text || null;
    } catch (err) {
      console.error('Failed to fetch URL:', err.message);
      return null;
    }
  }

  // Helper: Check if string is a URL
  function isUrl(text) {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  }

  // Helper: Generate post content
  async function generatePost(topic, articleContext = null) {
    const userPrompt = articleContext
      ? `Based on this article excerpt: "${articleContext}"\n\nWrite a compelling LinkedIn post about: ${topic}`
      : `Write a compelling LinkedIn post about: ${topic}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Write biting LinkedIn posts—sharp observations wrapped in dark humour. Keep it short, spicy, and real.

BE:
- Sarcastic about industry nonsense
- Blunt about workplace contradictions
- Funny but not trying to be
- Honest about what's actually stupid
- Dismissive of buzzwords and "synergy"

DON'T BE:
- Preachy or motivational
- A productivity guru
- Offering unsolicited advice
- Using corporate jargon ironically
- Performative or preachy

TONE: Sardonic mate, British wit, eye-rolling at corporate culture, genuinely bemused by bullshit.

CONSTRAINTS:
- ONE sharp paragraph max (150 words)
- Start with 👀 only (no emoji at end)
- Sarcasm not sappiness
- No engagement fishing
- Only 👀 as emoji (at start)
- Absolutely roast the topic if warranted

CRITICAL: Write EXACTLY about what they asked. No substitutions.`
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.5
    });

    return response.choices[0].message.content;
  }

  // Helper: Generate image for post
  async function generateImage(topic) {
    try {
      const imageResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `Create a professional, engaging image that visually represents this LinkedIn post topic: ${topic}. Photo-realistic style, human moment or workplace scene. High quality, 1024x1024 size. No text in the image.`,
        size: '1024x1024',
        quality: 'standard',
        n: 1
      });
      return imageResponse.data[0].url;
    } catch (err) {
      console.error('Image generation failed:', err.message);
      return null;
    }
  }

  // Helper: Post to LinkedIn
  async function postToLinkedIn(memberId, postContent, imageUrl = null) {
    const token = tokens[memberId];
    const author = `urn:li:person:${memberId}`;

    let body = {
      author,
      lifecycleState: 'PUBLISHED',
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "CONNECTIONS" },
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: postContent },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE'
        }
      }
    };

    // If we have an image, upload it and add to post
    if (imageUrl) {
      try {
        // Download image from URL
        const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imgResponse.data, 'binary');

        // Upload image to LinkedIn
        const uploadResp = await axios.post(
          'https://api.linkedin.com/v2/images?action=INIT',
          {
            initializeUploadRequest: {
              owner: author
            }
          },
          {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json'
            }
          }
        );

        const uploadUrl = uploadResp.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const imageAsset = uploadResp.data.value.image;

        // Upload the image file
        await axios.put(uploadUrl, imageBuffer, {
          headers: {
            'Content-Type': 'image/jpeg'
          }
        });

        // Add image to post
        body.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            media: imageAsset
          }
        ];
      } catch (uploadErr) {
        console.error('Failed to upload image to LinkedIn:', uploadErr.message);
        body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'NONE';
        delete body.specificContent['com.linkedin.ugc.ShareContent'].media;
      }
    }

    const resp = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      }
    });

    return resp.data;
  }

  // Command: /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `🚨 Welcome to LinkedIn Poster Bot! 🚨

I can automatically generate and post LinkedIn content for you.

First, connect your LinkedIn account:
👉 Use /connect to get started

Once connected, you can:
1. Send any topic → I'll generate a post with image
2. Paste a URL → I'll read the article and create a post based on it
3. Review the generated post → Confirm with Yes/No buttons before posting

Questions? Use /help`;

    await bot.sendMessage(chatId, welcomeMessage);
  });

  // Command: /connect
  bot.onText(/\/connect/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Check if already connected
    const existingMemberId = await getMemberIdForTelegram(telegramId);
    if (existingMemberId) {
      await bot.sendMessage(chatId, '✅ You are already connected to LinkedIn!\n\nJust send me a topic or URL to generate a post.');
      return;
    }

    // Generate OAuth link - use standard redirect URI that's registered in LinkedIn app
    const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
    const RENDER_API_URL = process.env.RENDER_API_URL || 'http://localhost:4000';
    const redirectUri = `${RENDER_API_URL}/auth/linkedin/callback`;
    const scope = encodeURIComponent('openid profile w_member_social');
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=telegram_${telegramId}`;

    await bot.sendMessage(chatId, `🔗 Click here to connect your LinkedIn account:\n\n${authUrl}\n\nAfter authorizing, come back here and I'll confirm the connection!`);
  });

  // Command: /status
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    const memberId = await getMemberIdForTelegram(telegramId);
    if (memberId) {
      await bot.sendMessage(chatId, `✅ Status: Connected to LinkedIn\n\nMember ID: ${memberId}\n\nYou can send me a topic or URL to generate a post!`);
    } else {
      await bot.sendMessage(chatId, '❌ Status: Not connected\n\nUse /connect to link your LinkedIn account.');
    }
  });

  // Command: /disconnect
  bot.onText(/\/disconnect/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    if (!supabase) {
      await bot.sendMessage(chatId, '❌ Database not available');
      return;
    }

    try {
      const { error } = await supabase
        .from('telegram_users')
        .update({ active: false })
        .eq('telegram_id', telegramId);

      if (error) throw error;
      await bot.sendMessage(chatId, '✅ Disconnected from LinkedIn\n\nUse /connect to reconnect anytime.');
    } catch (err) {
      await bot.sendMessage(chatId, '❌ Failed to disconnect: ' + err.message);
    }
  });

  // Command: /help
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `📖 LinkedIn Poster Bot Commands:

/start - Welcome message
/connect - Link your LinkedIn account
/status - Check connection status
/disconnect - Unlink LinkedIn account
/help - Show this message

🚀 How to use:
1. Use /connect to link LinkedIn
2. Send a topic: "Why remote work is changing teams"
3. Or paste a URL: https://example.com/article
4. Review the generated post
5. Click Yes to post, No to discard

The bot will create text + image automatically!`;

    await bot.sendMessage(chatId, helpMessage);
  });

  // Handle text messages (topics or URLs)
  bot.on('message', async (msg) => {
    // Ignore commands and non-text messages
    if (msg.text && msg.text.startsWith('/')) return;
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const input = msg.text.trim();

    if (input.length === 0) return;

    // Check LinkedIn connection
    const memberId = await getMemberIdForTelegram(telegramId);
    if (!memberId) {
      await bot.sendMessage(chatId, '❌ You need to connect LinkedIn first!\n\nUse /connect to get started.');
      return;
    }

    // Check token exists
    const token = tokens[memberId];
    if (!token) {
      await bot.sendMessage(chatId, '❌ Your LinkedIn token expired.\n\nUse /connect to reconnect.');
      return;
    }

    let topic = input;
    let articleContext = null;

    try {
      // Check if input is a URL
      if (isUrl(input)) {
        await bot.sendMessage(chatId, '🔍 Reading article...');
        articleContext = await fetchArticleContent(input);
        if (!articleContext) {
          await bot.sendMessage(chatId, '❌ Could not read article. Please provide a topic instead.');
          return;
        }
        // Use article title or first 100 chars as topic
        topic = articleContext.substring(0, 100);
      }

      // Validate topic length
      if (topic.length < 5) {
        await bot.sendMessage(chatId, '📝 Please send a longer topic or URL (at least 5 characters).');
        return;
      }

      await bot.sendMessage(chatId, '⏳ Generating post...');

      // Generate post content
      const generatedContent = await generatePost(topic, articleContext);

      await bot.sendMessage(chatId, `📝 Generated post:\n\n${generatedContent}\n\n🖼️ Generating image...`);

      // Generate image
      const imageUrl = await generateImage(topic);
      if (imageUrl) {
        await bot.sendMessage(chatId, '✅ Image generated!');
      } else {
        await bot.sendMessage(chatId, '⚠️ Image generation failed, will post without image');
      }

      // Store pending post
      const postId = `${telegramId}_${Date.now()}`;
      pendingPosts[postId] = {
        memberId,
        content: generatedContent,
        imageUrl,
        telegramId,
        chatId
      };

      // Show confirmation buttons
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Yes, post it!', callback_data: `confirm_${postId}` },
              { text: '❌ No, discard', callback_data: `discard_${postId}` }
            ]
          ]
        }
      };

      await bot.sendMessage(chatId, '📤 Ready to post?', opts);

    } catch (err) {
      console.error('Telegram bot error:', err.message);
      if (err.response?.status === 401) {
        await bot.sendMessage(chatId, '❌ Your LinkedIn token expired.\n\nUse /connect to reconnect.');
      } else {
        await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
      }
    }
  });

  // Handle button clicks for confirmation
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const telegramId = query.from.id;
    const data = query.data;

    if (data.startsWith('confirm_')) {
      const postId = data.replace('confirm_', '');
      const pendingPost = pendingPosts[postId];

      if (!pendingPost || pendingPost.telegramId !== telegramId) {
        await bot.answerCallbackQuery(query.id, 'Invalid request', true);
        return;
      }

      try {
        await bot.answerCallbackQuery(query.id, 'Publishing...');
        await bot.editMessageText('📤 Publishing to LinkedIn...', { chat_id: chatId, message_id: query.message.message_id });

        // Post to LinkedIn
        await postToLinkedIn(pendingPost.memberId, pendingPost.content, pendingPost.imageUrl);

        await bot.sendMessage(chatId, '✅ Successfully published to LinkedIn! 🎉');
        await updateLastUsed(telegramId);

        // Clean up
        delete pendingPosts[postId];
      } catch (err) {
        console.error('Post publication error:', err.message);
        await bot.sendMessage(chatId, `❌ Failed to post: ${err.message}`);
        delete pendingPosts[postId];
      }
    } else if (data.startsWith('discard_')) {
      const postId = data.replace('discard_', '');
      const pendingPost = pendingPosts[postId];

      if (!pendingPost || pendingPost.telegramId !== telegramId) {
        await bot.answerCallbackQuery(query.id, 'Invalid request', true);
        return;
      }

      await bot.answerCallbackQuery(query.id);
      await bot.editMessageText('❌ Post discarded', { chat_id: chatId, message_id: query.message.message_id });
      delete pendingPosts[postId];
    }
  });

  // Error handling
  bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error.message);
  });

  return bot;
}

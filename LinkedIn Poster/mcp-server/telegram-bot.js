import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

export function initTelegramBot(supabase, tokens, openai) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not set - Telegram bot disabled');
    return null;
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('✅ Telegram bot initialized');

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

  // Command: /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `🚨 Welcome to LinkedIn Poster Bot! 🚨

I can automatically generate and post LinkedIn content for you.

First, connect your LinkedIn account:
👉 Use /connect to get started

Once connected, simply send me any topic and I'll:
1. Generate a post using AI
2. Automatically publish it to your LinkedIn

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
      await bot.sendMessage(chatId, '✅ You are already connected to LinkedIn!\n\nJust send me a topic to generate a post.');
      return;
    }

    // Generate OAuth link - use standard redirect URI that's registered in LinkedIn app
    // The state parameter will contain the telegram_id so we can link them after OAuth
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
      await bot.sendMessage(chatId, `✅ Status: Connected to LinkedIn\n\nMember ID: ${memberId}\n\nYou can send me any topic to generate a post!`);
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
2. Send any text as a topic
3. Bot generates and posts automatically

Example:
"Why remote work is changing software development"

The bot will create a post and publish it to your LinkedIn feed.`;

    await bot.sendMessage(chatId, helpMessage);
  });

  // Handle regular text messages (topic submission)
  bot.on('message', async (msg) => {
    // Ignore commands
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const topic = msg.text;

    if (!topic || topic.trim().length === 0) return;

    // Validate topic length
    if (topic.length < 10) {
      await bot.sendMessage(chatId, '📝 Please send a longer topic (at least 10 characters).\n\nExample: "Why remote work is changing teams"');
      return;
    }

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

    try {
      await bot.sendMessage(chatId, '⏳ Generating your post...');

      // Generate post content
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Write LinkedIn posts as pure storytelling and curiosity. No advice, no insights, no prescriptions whatsoever. Just:

WRITE LIKE YOU'RE:
- Telling a funny or interesting story that happened
- Noticing something ridiculous or ironic and commenting on the absurdity
- Wondering out loud about something that confuses or intrigues you (genuine curiosity, not rhetorical)
- Sharing what you're currently trying to figure out or understand
- Making a witty observation about human nature, work culture, or everyday situations
- Describing a weird contradiction you spotted
- Riffing on something that caught your attention

NOT LIKE YOU'RE:
- Giving advice or tips
- Telling people what works or doesn't work
- Making broad claims about how things "should" be
- Offering lessons or takeaways
- Persuading anyone of anything
- Even subtly suggesting better ways to do things

TONE:
- Conversational and genuinely curious
- Funny when it naturally fits
- Honest about confusion or uncertainty
- Self-aware and a bit wry
- Uses strict British English (colour, organisation, realise, analyse, etc.)
- Authentic—like you're thinking out loud with peers, not performing for an audience

TECHNICAL:
- MAXIMUM 2-3 paragraphs only
- MUST start with 🚨 and end with 🚨
- MUST be directly about the topic provided
- NO engagement tactics ("What do you think?", "Let me know below", etc.)
- NO emojis except the required 🚨 ones
- NO prescriptive language whatsoever—if you catch yourself saying anything about what people should do or think, delete it

CRITICAL: You MUST use the user input provided and write about exactly what they ask. Do not ignore their topic or substitute your own ideas.`
          },
          {
            role: 'user',
            content: `Write a compelling LinkedIn post about: ${topic}`
          }
        ],
        max_tokens: 500,
        temperature: 0.5
      });

      const generatedContent = response.choices[0].message.content;

      await bot.sendMessage(chatId, `📝 Generated post:\n\n${generatedContent}\n\n🖼️ Generating image...`);

      // Generate image for the post
      let imageUrl = null;
      try {
        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: `Create a professional, engaging image that visually represents this LinkedIn post topic: ${topic}. Photo-realistic style, human moment or workplace scene. High quality, 1024x1024 size. No text in the image.`,
          size: '1024x1024',
          quality: 'standard',
          n: 1
        });
        imageUrl = imageResponse.data[0].url;
        console.log('Generated image URL:', imageUrl);
        await bot.sendMessage(chatId, '✅ Image generated! Publishing to LinkedIn...');
      } catch (imgErr) {
        console.error('Image generation failed:', imgErr.message);
        await bot.sendMessage(chatId, '⚠️ Image generation failed, posting without image...');
      }

      // Post to LinkedIn
      const author = `urn:li:person:${memberId}`;

      let body = {
        author,
        lifecycleState: 'PUBLISHED',
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "CONNECTIONS" },
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: generatedContent },
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
          // Continue without image
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

      await bot.sendMessage(chatId, '✅ Successfully published to LinkedIn! 🎉');
      await updateLastUsed(telegramId);

    } catch (err) {
      console.error('Telegram bot error:', err.message);
      if (err.response?.status === 401) {
        await bot.sendMessage(chatId, '❌ Your LinkedIn token expired.\n\nUse /connect to reconnect.');
      } else {
        await bot.sendMessage(chatId, `❌ Failed to generate/post: ${err.message}\n\nTry /status to check connection.`);
      }
    }
  });

  // Error handling
  bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error.message);
  });

  return bot;
}

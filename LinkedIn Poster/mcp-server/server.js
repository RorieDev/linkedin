import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { JSDOM } from 'jsdom';
import https from 'https';
import http from 'http';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { initTelegramBot } from './telegram-bot.js';

dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
  console.warn('⚠️  Supabase not configured - using in-memory storage (not persistent)');
}

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Server starting...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current directory:', process.cwd());

const PORT = process.env.PORT || 4000;
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.warn('Missing LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET / LINKEDIN_REDIRECT_URI in env');
}

// Load tokens from Supabase or initialize empty
async function loadTokens() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('member_id, access_token, expires_at');

    if (error) throw error;

    const tokens = {};
    if (data) {
      data.forEach(row => {
        tokens[row.member_id] = {
          access_token: row.access_token,
          expires_at: row.expires_at
        };
      });
    }
    return tokens;
  } catch (err) {
    console.error('Error loading tokens from Supabase:', err.message);
    return {};
  }
}

// Save token to Supabase
async function saveToken(memberId, token) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('tokens')
      .upsert({
        member_id: memberId,
        access_token: token.access_token,
        expires_at: token.expires_at
      }, { onConflict: 'member_id' });

    if (error) throw error;
  } catch (err) {
    console.error('Error saving token to Supabase:', err.message);
  }
}

// Load scheduled posts from Supabase or initialize empty
async function loadScheduledPosts() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*');

    if (error) throw error;

    const posts = {};
    if (data) {
      data.forEach(row => {
        posts[row.id] = {
          id: row.id,
          memberId: row.member_id,
          message: row.message,
          imageUrl: row.image_url,
          scheduledTime: row.scheduled_time,
          status: row.status,
          createdAt: row.created_at,
          publishedAt: row.published_at,
          linkedinResponse: row.linkedin_response,
          error: row.error_message
        };
      });
    }
    return posts;
  } catch (err) {
    console.error('Error loading scheduled posts from Supabase:', err.message);
    return {};
  }
}

// Save scheduled post to Supabase
async function saveScheduledPost(postId, post) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('scheduled_posts')
      .upsert({
        id: postId,
        member_id: post.memberId,
        message: post.message,
        image_url: post.imageUrl,
        scheduled_time: post.scheduledTime,
        status: post.status,
        created_at: post.createdAt,
        published_at: post.publishedAt,
        linkedin_response: post.linkedinResponse,
        error_message: post.error
      }, { onConflict: 'id' });

    if (error) throw error;
  } catch (err) {
    console.error('Error saving scheduled post to Supabase:', err.message);
  }
}

// Delete scheduled post from Supabase
async function deleteScheduledPost(postId) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting scheduled post from Supabase:', err.message);
  }
}

// In-memory token store (will be synced with Supabase)
let tokens = {};

// In-memory scheduled posts store (will be synced with Supabase)
let scheduledPosts = {};

// Initialize from Supabase on startup
async function initializeFromSupabase() {
  try {
    console.log('📡 Loading tokens from Supabase...');
    tokens = await loadTokens();
    console.log('📡 Loading scheduled posts from Supabase...');
    scheduledPosts = await loadScheduledPosts();
    console.log('✓ Loaded from Supabase:', Object.keys(tokens).length, 'tokens,', Object.keys(scheduledPosts).length, 'scheduled posts');
  } catch (err) {
    console.error('❌ Supabase initialization error:', err.message);
    throw err;
  }
}

// Initialize Telegram bot
let telegramBot = null;

console.log('🔄 Starting initialization...');
initializeFromSupabase()
  .then(() => {
    console.log('✅ Supabase loaded successfully');
    telegramBot = initTelegramBot(supabase, tokens, openai);
  })
  .catch(err => {
    console.error('❌ Failed to initialize Supabase:', err.message);
    console.log('⚠️  Continuing without Supabase data...');
  });

function linkedinAuthUrl(state) {
  // Scopes: openid profile for reading user info, w_member_social for posting
  const scope = encodeURIComponent('openid profile w_member_social');
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&state=${state}`;
}

app.get('/auth/linkedin', (req, res) => {
  const state = Math.random().toString(36).slice(2);
  res.redirect(linkedinAuthUrl(state));
});

app.get('/auth/linkedin/callback', async (req, res) => {
  console.log('=== LINKEDIN OAUTH CALLBACK ===');
  console.log('Query params:', { code: req.query.code?.substring(0, 20), state: req.query.state, error: req.query.error });
  const { code, state, error } = req.query;
  if (error) return res.status(400).json({ error });
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);

    const tokenResp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, expires_in, id_token } = tokenResp.data;

    // For OpenID Connect, extract user ID from id_token or access_token
    let memberId = null;

    // Try to decode the id_token JWT (without verification for now)
    if (id_token) {
      try {
        const parts = id_token.split('.');
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        memberId = decoded.sub || decoded.id;
        console.log('Extracted memberId from id_token:', memberId);
      } catch (e) {
        console.log('Failed to decode id_token:', e.message);
      }
    }

    // Fallback: Try to fetch with minimal permissions
    let profilePicture = null;
    let firstName = '';
    let lastName = '';

    if (!memberId) {
      try {
        const meResp = await axios.get('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        memberId = meResp.data.id;
        firstName = meResp.data.firstName?.localized?.en_US || Object.values(meResp.data.firstName?.localized || {})[0] || '';
        lastName = meResp.data.lastName?.localized?.en_US || Object.values(meResp.data.lastName?.localized || {})[0] || '';

        // Extract profile picture
        const pPic = meResp.data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier;
        if (pPic) profilePicture = pPic;

        console.log('Fetched memberId from /me endpoint:', memberId);
      } catch (err) {
        console.error('Failed to fetch /me:', err?.response?.data || err.message);
        // Last resort: Use a generated ID based on access_token hash
        const crypto = require('crypto');
        memberId = 'li_' + crypto.createHash('sha256').update(access_token).digest('hex').substring(0, 16);
        console.log('Generated fallback memberId:', memberId);
      }
    } else {
      // If we got memberId from ID token, still try to fetch profile for picture
      try {
        const meResp = await axios.get('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        firstName = meResp.data.firstName?.localized?.en_US || Object.values(meResp.data.firstName?.localized || {})[0] || '';
        lastName = meResp.data.lastName?.localized?.en_US || Object.values(meResp.data.lastName?.localized || {})[0] || '';
        // Extract profile picture
        const pPic = meResp.data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier;
        if (pPic) profilePicture = pPic;
      } catch (e) {
        console.log('Failed to fetch profile details:', e.message);
      }
    }

    const tokenData = {
      access_token,
      expires_at: Date.now() + (expires_in * 1000),
      profilePicture,
      name: `${firstName} ${lastName}`.trim()
    };
    tokens[memberId] = tokenData;
    await saveToken(memberId, tokenData);

    // Check if this is a Telegram OAuth callback
    if (state && state.startsWith('telegram_')) {
      const telegramId = parseInt(state.replace('telegram_', ''));

      // Link Telegram user to LinkedIn member
      if (supabase) {
        try {
          const { error: dbError } = await supabase
            .from('telegram_users')
            .upsert({
              telegram_id: telegramId,
              member_id: memberId,
              active: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' });

          if (dbError) {
            console.error('Failed to save Telegram user mapping:', dbError.message);
          } else {
            console.log('✅ Linked Telegram user', telegramId, 'to LinkedIn member', memberId);

            // Return success page for Telegram
            return res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>LinkedIn Connected</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #0A66C2 0%, #004182 100%);
                    color: white;
                    text-align: center;
                    padding: 20px;
                  }
                  .container {
                    max-width: 400px;
                  }
                  h1 { font-size: 48px; margin: 0 0 20px; }
                  p { font-size: 18px; line-height: 1.6; }
                  .emoji { font-size: 64px; margin-bottom: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="emoji">✅</div>
                  <h1>Success!</h1>
                  <p>Your LinkedIn account is now connected to the Telegram bot.</p>
                  <p>Return to Telegram and start sending topics to generate posts!</p>
                </div>
              </body>
              </html>
            `);
          }
        } catch (err) {
          console.error('Error linking Telegram user:', err.message);
        }
      }
    }

    res.json({ success: true, memberId });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: 'Token exchange or profile fetch failed' });
  }
});

// Telegram OAuth callback - links Telegram user to LinkedIn member
app.get('/auth/linkedin/callback/telegram/:telegramId', async (req, res) => {
  console.log('=== TELEGRAM LINKEDIN OAUTH CALLBACK ===');
  const { telegramId } = req.params;
  const { code, state, error } = req.query;

  if (error) return res.status(400).send(`OAuth error: ${error}`);
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    // Exchange code for token (same as regular OAuth)
    const redirectUri = `${process.env.RENDER_API_URL || 'http://localhost:4000'}/auth/linkedin/callback/telegram/${telegramId}`;
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);

    const tokenResp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, expires_in, id_token } = tokenResp.data;

    // Extract member ID (same logic as regular OAuth)
    let memberId = null;
    if (id_token) {
      try {
        const parts = id_token.split('.');
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        memberId = decoded.sub || decoded.id;
      } catch (e) {
        console.log('Failed to decode id_token:', e.message);
      }
    }

    if (!memberId) {
      try {
        const meResp = await axios.get('https://api.linkedin.com/v2/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        memberId = meResp.data.id;
      } catch (err) {
        const crypto = require('crypto');
        memberId = 'li_' + crypto.createHash('sha256').update(access_token).digest('hex').substring(0, 16);
      }
    }

    // Store token
    const tokenData = {
      access_token,
      expires_at: Date.now() + (expires_in * 1000)
    };
    tokens[memberId] = tokenData;
    await saveToken(memberId, tokenData);

    // Link Telegram user to LinkedIn member
    if (supabase) {
      const { error: dbError } = await supabase
        .from('telegram_users')
        .upsert({
          telegram_id: parseInt(telegramId),
          member_id: memberId,
          active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'telegram_id' });

      if (dbError) {
        console.error('Failed to save Telegram user mapping:', dbError.message);
      } else {
        console.log('✅ Linked Telegram user', telegramId, 'to LinkedIn member', memberId);
      }
    }

    // Send success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>LinkedIn Connected</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #0A66C2 0%, #004182 100%);
            color: white;
            text-align: center;
            padding: 20px;
          }
          .container {
            max-width: 400px;
          }
          h1 { font-size: 48px; margin: 0 0 20px; }
          p { font-size: 18px; line-height: 1.6; }
          .emoji { font-size: 64px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="emoji">✅</div>
          <h1>Success!</h1>
          <p>Your LinkedIn account is now connected to the Telegram bot.</p>
          <p>Return to Telegram and start sending topics to generate posts!</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Telegram OAuth error:', err?.response?.data || err.message);
    res.status(500).send(`Failed to connect: ${err.message}`);
  }
});

// Helper to scrape URL content
async function scrapeUrl(url) {
  if (!url) return null;
  try {
    console.log(`🔍 Scraping URL: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });

    const dom = new JSDOM(response.data);
    const doc = dom.window.document;

    // Remove unwanted elements
    const toRemove = doc.querySelectorAll('script, style, nav, footer, header, iframe, ads');
    toRemove.forEach(el => el.remove());

    // Try to find the article body first
    const selectors = ['article', '.article-body', '.post-content', 'main', '.content'];
    let contentEl = null;
    for (const selector of selectors) {
      const found = doc.querySelector(selector);
      if (found) {
        contentEl = found;
        break;
      }
    }

    const text = (contentEl || doc.body).textContent || '';
    const cleanedText = text.replace(/\s+/g, ' ').trim().substring(0, 8000);
    console.log(`✅ Scraped ${cleanedText.length} characters`);
    return cleanedText;
  } catch (err) {
    console.warn(`⚠️ Scraping failed for ${url}:`, err.message);
    return null;
  }
}

// Generate AI content. Body: { prompt, topic, sourceUrl }
app.post('/generate', async (req, res) => {
  const { prompt, topic, sourceUrl } = req.body;

  if (!prompt && !topic && !sourceUrl) {
    return res.status(400).json({ error: 'prompt, topic, or sourceUrl required' });
  }

  try {
    let scrapedContent = '';
    let urlContext = '';
    if (sourceUrl) {
      const text = await scrapeUrl(sourceUrl);
      if (text) {
        scrapedContent = `\n\nSource Content from ${sourceUrl}:\n${text}`;
        urlContext = ` based on the content from ${sourceUrl}`;
      } else {
        urlContext = ` based on this URL: ${sourceUrl}`;
      }
    }

    const defaultPrompt = topic
      ? `Write a compelling LinkedIn post about: ${topic}${urlContext}.`
      : `Write a compelling LinkedIn post based on the provided source content.`;

    const userPrompt = prompt || `${defaultPrompt}${scrapedContent} Make it engaging, professional, and suitable for posting on LinkedIn. Include relevant hashtags.`;

    console.log('Generating content with prompt:', userPrompt.substring(0, 100));

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

    const generatedContent = response.choices[0].message.content;
    console.log('Generated content:', generatedContent.substring(0, 100));

    res.json({ success: true, content: generatedContent });
  } catch (err) {
    console.error('OpenAI error:', err?.message);
    res.status(500).json({ error: 'Failed to generate content', details: err?.message });
  }
});

// Generate image. Body: { topic, sourceUrl }
app.post('/generate-image', async (req, res) => {
  const { topic, sourceUrl } = req.body;

  if (!topic && !sourceUrl) {
    return res.status(400).json({ error: 'topic or sourceUrl required' });
  }

  try {
    let finalTopic = topic;
    if (!finalTopic && sourceUrl) {
      console.log('Generating image topic from URL...');
      const text = await scrapeUrl(sourceUrl);
      if (text) {
        finalTopic = text.substring(0, 200);
      } else {
        finalTopic = sourceUrl;
      }
    }

    const imagePrompt = `A candid, authentic photo-realistic image capturing a funny human moment related to: ${finalTopic}. Real people in genuine expressions and interactions. No signs, banners, papers, documents, whiteboards, screens, labels, or anything with writing. Pure human moments—expressions, body language, interactions, emotions. Witty through visuals alone, not through text. Professional yet authentic, natural lighting, genuine situations. NO TEXT OF ANY KIND ANYWHERE IN THE IMAGE.`;

    console.log('Generating image with prompt:', imagePrompt.substring(0, 100));

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    });

    const imageUrl = response.data[0].url;
    console.log('Generated image URL:', imageUrl);

    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('Image generation error:', err?.message);
    res.status(500).json({ error: 'Failed to generate image', details: err?.message });
  }
});

// Helper function to download image and upload to LinkedIn
async function uploadImageToLinkedIn(imageUrl, memberId, accessToken) {
  try {
    // Download the image
    console.log('Downloading image from:', imageUrl);
    const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResp.data, 'binary');

    // Initialize upload to LinkedIn
    console.log('Initializing image upload to LinkedIn...');
    const initResp = await axios.post(
      'https://api.linkedin.com/v2/images?action=INIT',
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    const uploadUrl = initResp.data.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const mediaAsset = initResp.data.mediaAsset;

    console.log('Uploading image to:', uploadUrl);
    // Upload the image
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        'Content-Type': 'image/png'
      }
    });

    console.log('Image uploaded successfully. Media asset:', mediaAsset);
    return mediaAsset;
  } catch (err) {
    console.error('Image upload error:', err?.response?.data || err?.message);
    throw err;
  }
}

// Post a UGC post with optional image. Body: { memberId, message, imageUrl }
app.post('/post', async (req, res) => {
  console.log('=== POST REQUEST RECEIVED ===');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  const { memberId, message, imageUrl } = req.body;
  console.log('Extracted memberId:', memberId, 'Message length:', message?.length, 'Has image:', !!imageUrl);
  if (!memberId || !message) return res.status(400).json({ error: 'memberId and message required' });

  // Support demo mode for testing (demo_user_* IDs)
  if (memberId.startsWith('demo_user_')) {
    return res.json({
      success: true,
      data: {
        id: `demo_post_${Date.now()}`,
        message: `[DEMO MODE] Posted: ${message.substring(0, 50)}...`,
        memberId,
        timestamp: new Date().toISOString()
      }
    });
  }

  const entry = tokens[memberId];
  if (!entry) return res.status(404).json({ error: 'No token for this memberId. Complete OAuth flow first.' });

  try {
    const author = `urn:li:person:${memberId}`;
    let media = [];
    let shareMediaCategory = 'NONE';

    // Upload image if provided
    if (imageUrl) {
      console.log('Uploading image...');
      const mediaAsset = await uploadImageToLinkedIn(imageUrl, memberId, entry.access_token);
      media.push({
        status: 'READY',
        description: {
          text: 'Generated LinkedIn post image'
        },
        media: mediaAsset
      });
      shareMediaCategory = 'IMAGE';
    }

    const body = {
      author,
      lifecycleState: 'PUBLISHED',
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "CONNECTIONS" },
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: message },
          shareMediaCategory,
          ...(media.length > 0 && { media })
        }
      }
    };

    console.log('Posting to LinkedIn with body:', JSON.stringify(body, null, 2));
    const resp = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
      headers: {
        Authorization: `Bearer ${entry.access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      }
    });

    console.log('Post response status:', resp.status);
    console.log('Post response data:', JSON.stringify(resp.data, null, 2));
    res.json({ success: true, data: resp.data });
  } catch (err) {
    console.error('Post error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Post failed', details: err?.response?.data || err.message });
  }
});

app.get('/tokens', (req, res) => res.json(tokens));

// Schedule a post for later. Body: { memberId, message, imageUrl, scheduledTime }
app.post('/schedule', async (req, res) => {
  const { memberId, message, imageUrl, scheduledTime } = req.body;

  if (!memberId || !message || !scheduledTime) {
    return res.status(400).json({ error: 'memberId, message, and scheduledTime required' });
  }

  try {
    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate < new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    const postId = 'scheduled_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const post = {
      id: postId,
      memberId,
      message,
      imageUrl,
      scheduledTime: scheduleDate.toISOString(),
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    scheduledPosts[postId] = post;
    await saveScheduledPost(postId, post);

    console.log(`Post scheduled for ${scheduleDate.toISOString()}:`, postId);
    res.json({ success: true, postId, scheduledTime: scheduleDate.toISOString() });
  } catch (err) {
    console.error('Scheduling error:', err?.message);
    res.status(500).json({ error: 'Failed to schedule post', details: err?.message });
  }
});

// Get all scheduled posts
app.get('/scheduled-posts', (req, res) => {
  const posts = Object.values(scheduledPosts).sort((a, b) =>
    new Date(a.scheduledTime) - new Date(b.scheduledTime)
  );
  res.json({ success: true, posts });
});

// Cancel a scheduled post
app.delete('/scheduled-posts/:postId', async (req, res) => {
  const { postId } = req.params;
  if (scheduledPosts[postId]) {
    delete scheduledPosts[postId];
    await deleteScheduledPost(postId);
    res.json({ success: true, message: 'Scheduled post cancelled' });
  } else {
    res.status(404).json({ error: 'Scheduled post not found' });
  }
});

// Update a scheduled post
app.put('/scheduled-posts/:postId', async (req, res) => {
  const { postId } = req.params;
  const { message, imageUrl, scheduledTime } = req.body;

  if (!scheduledPosts[postId]) {
    return res.status(404).json({ error: 'Scheduled post not found' });
  }

  const post = scheduledPosts[postId];

  if (message) post.message = message;
  if (imageUrl !== undefined) post.imageUrl = imageUrl;
  if (scheduledTime) {
    const scheduleDate = new Date(scheduledTime);
    if (scheduleDate < new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }
    post.scheduledTime = scheduleDate.toISOString();
    // Reset status to scheduled if it was failed
    if (post.status === 'failed') post.status = 'scheduled';
  }

  try {
    scheduledPosts[postId] = post;
    await saveScheduledPost(postId, post);
    console.log(`Updated scheduled post: ${postId}`);
    res.json({ success: true, post });
  } catch (err) {
    console.error('Update error:', err?.message);
    res.status(500).json({ error: 'Failed to update post', details: err?.message });
  }
});

// Job scheduler - check every minute for posts to publish
cron.schedule('* * * * *', async () => {
  const now = new Date();

  for (const [postId, post] of Object.entries(scheduledPosts)) {
    if (post.status === 'scheduled' && new Date(post.scheduledTime) <= now) {
      console.log('Publishing scheduled post:', postId);
      post.status = 'publishing';

      try {
        // Post to LinkedIn
        const author = `urn:li:person:${post.memberId}`;
        let media = [];
        let shareMediaCategory = 'NONE';

        if (post.imageUrl) {
          const entry = tokens[post.memberId];
          if (entry) {
            const mediaAsset = await uploadImageToLinkedIn(post.imageUrl, post.memberId, entry.access_token);
            media.push({
              status: 'READY',
              description: { text: 'Generated LinkedIn post image' },
              media: mediaAsset
            });
            shareMediaCategory = 'IMAGE';
          }
        }

        const body = {
          author,
          lifecycleState: 'PUBLISHED',
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "CONNECTIONS" },
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: post.message },
              shareMediaCategory,
              ...(media.length > 0 && { media })
            }
          }
        };

        const entry = tokens[post.memberId];
        if (!entry) throw new Error('No token for this memberId');

        const resp = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
          headers: {
            Authorization: `Bearer ${entry.access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          }
        });

        post.status = 'published';
        post.publishedAt = new Date().toISOString();
        post.linkedinResponse = resp.data;
        console.log('Successfully published scheduled post:', postId);
        await saveScheduledPost(postId, post);
      } catch (err) {
        console.error('Failed to publish scheduled post:', postId, err?.message);
        post.status = 'failed';
        post.error = err?.message;
        await saveScheduledPost(postId, post);
      }
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Serve frontend static files from dist directory
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

console.log('🚀 About to listen on PORT:', PORT);
app.listen(PORT, () => {
  console.log(`✅ LinkedIn MCP server running on http://localhost:${PORT}`);
  console.log('📡 Health check: GET /health');
  console.log('🤖 API endpoints ready');
});

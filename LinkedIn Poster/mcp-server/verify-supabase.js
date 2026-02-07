import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🔍 Verifying Supabase setup...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  try {
    // Test connection
    console.log('✓ Credentials found');
    console.log(`  URL: ${supabaseUrl}`);
    console.log(`  Key: ${supabaseKey.substring(0, 30)}...`);
    console.log('');

    // Check tokens table
    console.log('Checking "tokens" table...');
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select('*')
      .limit(1);

    if (tokensError) {
      console.error('❌ Error accessing tokens table:', tokensError.message);
    } else {
      console.log('✓ tokens table exists');
      console.log('  Sample columns: member_id, access_token, expires_at');
    }
    console.log('');

    // Check scheduled_posts table
    console.log('Checking "scheduled_posts" table...');
    const { data: posts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .limit(1);

    if (postsError) {
      console.error('❌ Error accessing scheduled_posts table:', postsError.message);
    } else {
      console.log('✓ scheduled_posts table exists');
      console.log('  Sample columns: id, member_id, message, image_url, scheduled_time, status, created_at, published_at, linkedin_response, error_message');
    }
    console.log('');

    if (!tokensError && !postsError) {
      console.log('✅ Supabase setup verified successfully!');
    } else {
      console.log('⚠️  Some tables are missing. You may need to create them.');
    }
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

verify();

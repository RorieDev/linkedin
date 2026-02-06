-- Create tokens table
CREATE TABLE tokens (
  member_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create scheduled_posts table
CREATE TABLE scheduled_posts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES tokens(member_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  image_url TEXT,
  scheduled_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  linkedin_response JSONB,
  error_message TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX idx_scheduled_posts_member_id ON scheduled_posts(member_id);

-- Enable Row Level Security
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create a public policy (anyone can read/write)
-- For production, you should implement proper authentication
CREATE POLICY "Allow anonymous access" ON tokens
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Allow anonymous access" ON scheduled_posts
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

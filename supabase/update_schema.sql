-- Add frequency to watchlist
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily';

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

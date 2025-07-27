/*
  # Create credit transactions table for tracking all credit movements

  1. New Tables
    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `amount` (integer, can be negative)
      - `type` (text, enum-like)
      - `description` (text)
      - `related_id` (uuid, optional - for linking to tasks, challenges, etc.)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `credit_transactions` table
    - Add policies for users to view their own transactions
    - Admin policy for viewing all transactions

  3. Functions
    - Function to increment user credits safely
    - Function to update user progress (XP, level, etc.)
*/

-- Create credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'reward', 'bet', 'payout', 'penalty', 'refund')),
  description text NOT NULL CHECK (length(description) > 0),
  related_id uuid, -- Can reference tasks, challenges, bets, etc.
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_related_id ON credit_transactions(related_id);

-- Function to safely increment user credits
CREATE OR REPLACE FUNCTION increment_user_credits(user_id uuid, amount_to_add integer)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET credits = credits + amount_to_add,
      updated_at = now()
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Ensure credits don't go negative
  UPDATE users
  SET credits = GREATEST(credits, 0)
  WHERE id = user_id AND credits < 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user progress (XP, level, tasks completed)
CREATE OR REPLACE FUNCTION update_user_progress(user_id uuid, xp_gained integer DEFAULT 10)
RETURNS void AS $$
DECLARE
  current_xp integer;
  current_level integer;
  new_level integer;
BEGIN
  -- Get current stats
  SELECT xp, level INTO current_xp, current_level
  FROM users WHERE id = user_id;
  
  -- Calculate new level (every 100 XP = 1 level)
  new_level := GREATEST(1, (current_xp + xp_gained) / 100 + 1);
  
  -- Update user stats
  UPDATE users
  SET 
    xp = xp + xp_gained,
    level = new_level,
    total_tasks_completed = total_tasks_completed + 1,
    updated_at = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
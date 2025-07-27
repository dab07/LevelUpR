/*
  # Create challenges and betting system tables

  1. New Tables
    - `challenges` - Task challenges for betting
    - `bets` - Individual user bets on challenges
    - `completion_votes` - Votes on challenge completion
    - `admin_tickets` - Dispute resolution system

  2. Security
    - Enable RLS on all tables
    - Policies for challenge participation and voting

  3. Features
    - Friend group and global challenges
    - Betting mechanics with credit pools
    - Proof verification and voting system
    - Admin dispute resolution
*/

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) > 0 AND length(title) <= 200),
  description text NOT NULL CHECK (length(description) > 0 AND length(description) <= 1000),
  minimum_bet integer NOT NULL CHECK (minimum_bet > 0),
  deadline timestamptz NOT NULL,
  is_global boolean DEFAULT false,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voting', 'completed', 'cancelled')),
  proof_image_url text,
  proof_submitted_at timestamptz,
  voting_ends_at timestamptz,
  total_yes_bets integer DEFAULT 0 CHECK (total_yes_bets >= 0),
  total_no_bets integer DEFAULT 0 CHECK (total_no_bets >= 0),
  total_credits_pool integer DEFAULT 0 CHECK (total_credits_pool >= 0),
  is_completed boolean,
  completion_votes jsonb DEFAULT '{"yes": 0, "no": 0}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (is_global = true AND group_id IS NULL AND minimum_bet >= 20) OR
    (is_global = false AND group_id IS NOT NULL AND minimum_bet >= 1)
  )
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  bet_type text NOT NULL CHECK (bet_type IN ('yes', 'no')),
  amount integer NOT NULL CHECK (amount > 0),
  payout integer DEFAULT 0 CHECK (payout >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Create completion votes table
CREATE TABLE IF NOT EXISTS completion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('yes', 'no')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Create admin tickets table
CREATE TABLE IF NOT EXISTS admin_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('unfair_voting', 'fake_proof', 'harassment', 'other')),
  description text NOT NULL CHECK (length(description) > 0 AND length(description) <= 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  admin_id uuid REFERENCES users(id),
  resolution text CHECK (length(resolution) <= 2000),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tickets ENABLE ROW LEVEL SECURITY;

-- Challenges policies
CREATE POLICY "Users can view challenges they have access to"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (
    is_global = true OR
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create challenges"
  ON challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND (
      (is_global = true AND group_id IS NULL) OR
      (is_global = false AND group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Challenge creators can update their challenges"
  ON challenges
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Bets policies
CREATE POLICY "Users can view bets on accessible challenges"
  ON bets
  FOR SELECT
  TO authenticated
  USING (
    challenge_id IN (
      SELECT id FROM challenges WHERE
        is_global = true OR
        group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can place their own bets"
  ON bets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Completion votes policies
CREATE POLICY "Users can view votes on challenges they bet on"
  ON completion_votes
  FOR SELECT
  TO authenticated
  USING (
    challenge_id IN (
      SELECT challenge_id FROM bets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Betting participants can vote"
  ON completion_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    challenge_id IN (
      SELECT challenge_id FROM bets WHERE user_id = auth.uid()
    )
  );

-- Admin tickets policies
CREATE POLICY "Users can view their own tickets"
  ON admin_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create tickets"
  ON admin_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Create triggers for updated_at
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_tickets_updated_at
  BEFORE UPDATE ON admin_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_group ON challenges(group_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_deadline ON challenges(deadline);
CREATE INDEX IF NOT EXISTS idx_challenges_is_global ON challenges(is_global);

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_challenge ON bets(challenge_id);
CREATE INDEX IF NOT EXISTS idx_bets_type ON bets(bet_type);

CREATE INDEX IF NOT EXISTS idx_completion_votes_challenge ON completion_votes(challenge_id);
CREATE INDEX IF NOT EXISTS idx_completion_votes_user ON completion_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_tickets_reporter ON admin_tickets(reporter_id);
CREATE INDEX IF NOT EXISTS idx_admin_tickets_challenge ON admin_tickets(challenge_id);
CREATE INDEX IF NOT EXISTS idx_admin_tickets_status ON admin_tickets(status);

-- Function to update challenge bet totals
CREATE OR REPLACE FUNCTION update_challenge_bets(challenge_id uuid, bet_type text, bet_amount integer)
RETURNS void AS $$
BEGIN
  IF bet_type = 'yes' THEN
    UPDATE challenges
    SET 
      total_yes_bets = total_yes_bets + bet_amount,
      total_credits_pool = total_credits_pool + bet_amount,
      updated_at = now()
    WHERE id = challenge_id;
  ELSE
    UPDATE challenges
    SET 
      total_no_bets = total_no_bets + bet_amount,
      total_credits_pool = total_credits_pool + bet_amount,
      updated_at = now()
    WHERE id = challenge_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically finalize challenges after voting period
CREATE OR REPLACE FUNCTION finalize_expired_challenges()
RETURNS void AS $$
DECLARE
  challenge_record RECORD;
  yes_votes integer;
  no_votes integer;
  is_completed boolean;
BEGIN
  FOR challenge_record IN
    SELECT id FROM challenges
    WHERE status = 'voting' AND voting_ends_at < now()
  LOOP
    -- Count votes
    SELECT 
      COUNT(*) FILTER (WHERE vote = 'yes'),
      COUNT(*) FILTER (WHERE vote = 'no')
    INTO yes_votes, no_votes
    FROM completion_votes
    WHERE challenge_id = challenge_record.id;
    
    -- Determine completion
    is_completed := yes_votes > no_votes;
    
    -- Update challenge
    UPDATE challenges
    SET 
      status = 'completed',
      is_completed = is_completed,
      completion_votes = jsonb_build_object('yes', yes_votes, 'no', no_votes),
      updated_at = now()
    WHERE id = challenge_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
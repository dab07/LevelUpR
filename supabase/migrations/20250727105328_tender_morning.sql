/*
  # Create storage buckets and additional utility functions

  1. Storage Buckets
    - `avatars` - User profile pictures
    - `challenge_proofs` - Challenge completion proof images
    - `group_images` - Group profile pictures

  2. Additional Functions
    - Daily login processing
    - Challenge payout calculations
    - User statistics updates

  3. Security
    - Storage policies for secure file access
    - RLS policies for file operations
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('challenge_proofs', 'challenge_proofs', false),
  ('group_images', 'group_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for challenge proofs
CREATE POLICY "Challenge proofs are viewable by participants"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'challenge_proofs' AND
    (storage.foldername(name))[1]::uuid IN (
      SELECT challenge_id::text FROM bets WHERE user_id = auth.uid()
      UNION
      SELECT id::text FROM challenges WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Challenge creators can upload proof"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'challenge_proofs' AND
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM challenges WHERE creator_id = auth.uid()
    )
  );

-- Storage policies for groups images
CREATE POLICY "Group images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'group_images');

CREATE POLICY "Group admins can upload group images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'group_images' AND
    (storage.foldername(name))[1]::uuid IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Function to process daily login and streak
CREATE OR REPLACE FUNCTION process_daily_login(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_record RECORD;
  today_date date;
  last_login_date date;
  is_consecutive boolean;
  new_streak integer;
BEGIN
  -- Get user data
  SELECT last_login_date, daily_login_streak
  INTO user_record
  FROM users
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  today_date := CURRENT_DATE;
  last_login_date := DATE(user_record.last_login_date);

  -- Check if already logged in today
  IF last_login_date = today_date THEN
    RETURN false; -- Already logged in today
  END IF;

  -- Check if login is consecutive
  is_consecutive := (last_login_date = today_date - INTERVAL '1 day');
  new_streak := CASE
    WHEN is_consecutive THEN user_record.daily_login_streak + 1
    ELSE 1
  END;

  -- Update user login data
  UPDATE users
  SET
    last_login_date = now(),
    daily_login_streak = new_streak,
    updated_at = now()
  WHERE id = user_id;

  -- Add credit transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (user_id, 1, 'reward', 'Daily login reward');

  -- Update credits
  PERFORM increment_user_credits(user_id, 1);

  RETURN true; -- Login reward given
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and distribute challenge payouts
CREATE OR REPLACE FUNCTION distribute_challenge_payouts(challenge_id uuid)
RETURNS void AS $$
DECLARE
  challenge_record RECORD;
  bet_record RECORD;
  total_yes_amount integer := 0;
  total_no_amount integer := 0;
  yes_payout_pool numeric;
  no_payout_pool numeric;
  creator_bonus numeric;
  user_payout numeric;
  user_proportion numeric;
BEGIN
  -- Get challenge data
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id AND status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found or not completed';
  END IF;

  -- Calculate total bet amounts
  SELECT
    COALESCE(SUM(CASE WHEN bet_type = 'yes' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bet_type = 'no' THEN amount ELSE 0 END), 0)
  INTO total_yes_amount, total_no_amount
  FROM bets
  WHERE challenge_id = challenge_id;

  IF challenge_record.is_completed THEN
    -- Challenge was completed successfully

    -- Creator gets 50% of "No" votes as bonus
    creator_bonus := total_no_amount * 0.5;
    IF creator_bonus > 0 THEN
      INSERT INTO credit_transactions (user_id, amount, type, description, related_id)
      VALUES (challenge_record.creator_id, creator_bonus::integer, 'payout', 'Challenge completion bonus', challenge_id);

      PERFORM increment_user_credits(challenge_record.creator_id, creator_bonus::integer);
    END IF;

    -- "Yes" voters split remaining 50% of "No" votes proportionally
    yes_payout_pool := total_no_amount * 0.5;

    FOR bet_record IN
      SELECT user_id, amount FROM bets
      WHERE challenge_id = challenge_id AND bet_type = 'yes'
    LOOP
      IF total_yes_amount > 0 THEN
        user_proportion := bet_record.amount::numeric / total_yes_amount::numeric;
        user_payout := bet_record.amount + (yes_payout_pool * user_proportion);

        -- Update bet record with payout
        UPDATE bets
        SET payout = user_payout::integer
        WHERE challenge_id = challenge_id AND user_id = bet_record.user_id;

        -- Add credit transaction
        INSERT INTO credit_transactions (user_id, amount, type, description, related_id)
        VALUES (bet_record.user_id, user_payout::integer, 'payout', 'Winning bet payout', challenge_id);

        -- Update user credits
        PERFORM increment_user_credits(bet_record.user_id, user_payout::integer);
      END IF;
    END LOOP;

  ELSE
    -- Challenge was not completed

    -- "No" voters get refunds + all "Yes" vote credits proportionally
    FOR bet_record IN
      SELECT user_id, amount FROM bets
      WHERE challenge_id = challenge_id AND bet_type = 'no'
    LOOP
      IF total_no_amount > 0 THEN
        user_proportion := bet_record.amount::numeric / total_no_amount::numeric;
        user_payout := bet_record.amount + (total_yes_amount * user_proportion);

        -- Update bet record with payout
        UPDATE bets
        SET payout = user_payout::integer
        WHERE challenge_id = challenge_id AND user_id = bet_record.user_id;

        -- Add credit transaction
        INSERT INTO credit_transactions (user_id, amount, type, description, related_id)
        VALUES (bet_record.user_id, user_payout::integer, 'payout', 'Winning bet payout', challenge_id);

        -- Update user credits
        PERFORM increment_user_credits(bet_record.user_id, user_payout::integer);
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_id uuid)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_tasks_completed', u.total_tasks_completed,
    'current_streak', u.daily_login_streak,
    'current_level', u.level,
    'current_xp', u.xp,
    'total_credits_earned', COALESCE(ct_earned.total, 0),
    'total_credits_spent', COALESCE(ct_spent.total, 0),
    'active_challenges', COALESCE(ac.count, 0),
    'completed_challenges', COALESCE(cc.count, 0),
    'win_rate', CASE
      WHEN COALESCE(wb.total_bets, 0) > 0
      THEN ROUND((COALESCE(wb.winning_bets, 0)::numeric / wb.total_bets::numeric) * 100, 2)
      ELSE 0
    END
  ) INTO stats
  FROM users u
  LEFT JOIN (
    SELECT user_id, SUM(amount) as total
    FROM credit_transactions
    WHERE user_id = get_user_stats.user_id AND amount > 0
    GROUP BY user_id
  ) ct_earned ON u.id = ct_earned.user_id
  LEFT JOIN (
    SELECT user_id, SUM(ABS(amount)) as total
    FROM credit_transactions
    WHERE user_id = get_user_stats.user_id AND amount < 0
    GROUP BY user_id
  ) ct_spent ON u.id = ct_spent.user_id
  LEFT JOIN (
    SELECT creator_id, COUNT(*) as count
    FROM challenges
    WHERE creator_id = get_user_stats.user_id AND status = 'active'
    GROUP BY creator_id
  ) ac ON u.id = ac.creator_id
  LEFT JOIN (
    SELECT creator_id, COUNT(*) as count
    FROM challenges
    WHERE creator_id = get_user_stats.user_id AND status = 'completed'
    GROUP BY creator_id
  ) cc ON u.id = cc.creator_id
  LEFT JOIN (
    SELECT
      b.user_id,
      COUNT(*) as total_bets,
      COUNT(*) FILTER (WHERE b.payout > b.amount) as winning_bets
    FROM bets b
    JOIN challenges c ON b.challenge_id = c.id
    WHERE b.user_id = get_user_stats.user_id AND c.status = 'completed'
    GROUP BY b.user_id
  ) wb ON u.id = wb.user_id
  WHERE u.id = get_user_stats.user_id;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  -- Cancel challenges that are past deadline and still active
  UPDATE challenges
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE status = 'active' AND deadline < now();

  -- Refund bets for cancelled challenges
  INSERT INTO credit_transactions (user_id, amount, type, description, related_id)
  SELECT
    b.user_id,
    b.amount,
    'refund',
    'Refund for cancelled challenge',
    b.challenge_id
  FROM bets b
  JOIN challenges c ON b.challenge_id = c.id
  WHERE c.status = 'cancelled' AND b.payout = 0;

  -- Update user credits for refunds
  UPDATE users
  SET credits = credits + refund_amount.total
  FROM (
    SELECT
      b.user_id,
      SUM(b.amount) as total
    FROM bets b
    JOIN challenges c ON b.challenge_id = c.id
    WHERE c.status = 'cancelled' AND b.payout = 0
    GROUP BY b.user_id
  ) refund_amount
  WHERE users.id = refund_amount.user_id;

  -- Mark bets as refunded
  UPDATE bets
  SET payout = amount
  FROM challenges c
  WHERE bets.challenge_id = c.id AND c.status = 'cancelled' AND bets.payout = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

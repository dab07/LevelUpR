/*
  # Update challenges table for enhanced proof submission and phase management

  1. Schema Changes
    - Add proof_description column for optional proof descriptions
    - Add indexes for better performance on time-based queries

  2. Functions
    - Update challenge status management functions
    - Add automatic challenge expiration handling
*/

-- Add proof_description column to challenges table
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS proof_description text CHECK (length(proof_description) <= 1000);

-- Add indexes for better performance on time-based status updates
CREATE INDEX IF NOT EXISTS idx_challenges_status_deadline ON challenges(status, deadline);
CREATE INDEX IF NOT EXISTS idx_challenges_voting_ends ON challenges(voting_ends_at) WHERE voting_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_proof_deadline ON challenges(deadline, proof_submitted_at) WHERE status = 'active';

-- Function to automatically handle challenge status transitions
CREATE OR REPLACE FUNCTION update_challenge_statuses()
RETURNS void AS $$
DECLARE
  challenge_record RECORD;
  proof_deadline timestamptz;
BEGIN
  -- Handle active challenges that have passed their deadlines
  FOR challenge_record IN
    SELECT id, deadline, proof_image_url, proof_submitted_at
    FROM challenges
    WHERE status = 'active' AND deadline < now()
  LOOP
    proof_deadline := challenge_record.deadline + INTERVAL '3 hours';
    
    -- If proof deadline has passed and no proof submitted, mark as failed
    IF now() > proof_deadline AND challenge_record.proof_image_url IS NULL THEN
      UPDATE challenges
      SET
        status = 'completed',
        is_completed = false,
        updated_at = now()
      WHERE id = challenge_record.id;
    END IF;
  END LOOP;

  -- Handle voting challenges where voting period has ended
  FOR challenge_record IN
    SELECT id FROM challenges
    WHERE status = 'voting' AND voting_ends_at < now()
  LOOP
    PERFORM finalize_challenge_voting(challenge_record.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to finalize a specific challenge's voting
CREATE OR REPLACE FUNCTION finalize_challenge_voting(challenge_id uuid)
RETURNS void AS $$
DECLARE
  yes_votes integer;
  no_votes integer;
  is_completed boolean;
BEGIN
  -- Count votes
  SELECT
    COUNT(*) FILTER (WHERE vote = 'yes'),
    COUNT(*) FILTER (WHERE vote = 'no')
  INTO yes_votes, no_votes
  FROM completion_votes
  WHERE challenge_id = finalize_challenge_voting.challenge_id;

  -- Determine completion (majority wins, ties go to failure)
  is_completed := yes_votes > no_votes;

  -- Update challenge
  UPDATE challenges
  SET
    status = 'completed',
    is_completed = is_completed,
    completion_votes = jsonb_build_object('yes', yes_votes, 'no', no_votes),
    updated_at = now()
  WHERE id = finalize_challenge_voting.challenge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing finalize_expired_challenges function to use the new function
CREATE OR REPLACE FUNCTION finalize_expired_challenges()
RETURNS void AS $$
BEGIN
  PERFORM update_challenge_statuses();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get challenge phase information
CREATE OR REPLACE FUNCTION get_challenge_phase(challenge_id uuid)
RETURNS text AS $$
DECLARE
  challenge_record RECORD;
  current_time timestamptz := now();
  proof_deadline timestamptz;
BEGIN
  SELECT status, deadline, proof_image_url, voting_ends_at, is_completed
  INTO challenge_record
  FROM challenges
  WHERE id = challenge_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  proof_deadline := challenge_record.deadline + INTERVAL '3 hours';

  -- Determine phase based on status and timestamps
  CASE challenge_record.status
    WHEN 'completed' THEN
      RETURN 'completed';
    WHEN 'voting' THEN
      RETURN 'verification';
    WHEN 'active' THEN
      IF current_time < challenge_record.deadline THEN
        RETURN 'betting';
      ELSIF current_time >= challenge_record.deadline AND current_time < proof_deadline THEN
        IF challenge_record.proof_image_url IS NOT NULL THEN
          RETURN 'verification';
        ELSE
          RETURN 'proof_submission';
        END IF;
      ELSE
        RETURN 'completed';
      END IF;
    ELSE
      RETURN 'unknown';
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a trigger to automatically update challenge statuses when accessed
-- This ensures status is always current without requiring manual calls
CREATE OR REPLACE FUNCTION trigger_update_challenge_status()
RETURNS trigger AS $$
BEGIN
  -- Only run status update for SELECT operations on challenges that might need updates
  IF TG_OP = 'SELECT' AND (NEW.status IN ('active', 'voting')) THEN
    PERFORM update_challenge_statuses();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We don't create the trigger here as it would run on every SELECT
-- Instead, we'll handle status updates in the application layer for better performance

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_challenge_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_challenge_voting(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_phase(uuid) TO authenticated;
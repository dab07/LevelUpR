DROP POLICY IF EXISTS "Challenge creators can upload proof" ON storage.objects;
DROP POLICY IF EXISTS "Challenge proofs are viewable by participants" ON storage.objects;

-- Create improved policies for challenge proofs
CREATE POLICY "Users can upload challenge proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'challenge_proofs' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view challenge proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'challenge_proofs' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their challenge proofs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'challenge_proofs' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their challenge proofs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'challenge_proofs' AND
    auth.uid() IS NOT NULL
  );
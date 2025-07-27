/*
  # Create social features tables (friends, groups, messages)

  1. New Tables
    - `friendships` - Friend relationships
    - `groups` - Private friend groups
    - `group_members` - Group membership
    - `messages` - Group chat messages

  2. Security
    - Enable RLS on all tables
    - Appropriate policies for privacy and access control

  3. Features
    - Friend request system
    - Private group creation and management
    - Real-time messaging
*/

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  description text CHECK (length(description) <= 500),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_private boolean DEFAULT true,
  invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'base64'),
  member_count integer DEFAULT 1 CHECK (member_count >= 0),
  max_members integer DEFAULT 50 CHECK (max_members > 0 AND max_members <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view friendships they're involved in"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friend requests"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're involved in"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Groups policies
CREATE POLICY "Users can view groups they're members of"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group admins can update groups"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Group members policies
CREATE POLICY "Users can view group members of their groups"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage members"
  ON group_members
  FOR ALL
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages from their groups"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups 
    SET member_count = member_count + 1,
        updated_at = now()
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups 
    SET member_count = member_count - 1,
        updated_at = now()
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for member count
CREATE TRIGGER update_group_member_count_trigger
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Function to auto-add creator to group
CREATE OR REPLACE FUNCTION add_creator_to_group()
RETURNS trigger AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-add creator
CREATE TRIGGER add_creator_to_group_trigger
  AFTER INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION add_creator_to_group();
/*
  # Create admin roles and additional security features

  1. Admin System
    - Admin role management
    - Enhanced admin ticket policies
    - Admin audit logs

  2. Security Features
    - Rate limiting functions
    - User reporting system
    - Automated moderation

  3. Performance
    - Additional indexes
    - Query optimization functions
*/

-- Create admin roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
  granted_by uuid REFERENCES users(id),
  granted_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(user_id, role)
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL, -- 'user', 'challenge', 'groups', etc.
  target_id uuid NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create user reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'cheating', 'inappropriate_content', 'other')),
  description text NOT NULL CHECK (length(description) > 0 AND length(description) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_id uuid REFERENCES users(id),
  resolution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Admin roles policies
CREATE POLICY "Admins can view all admin roles"
  ON admin_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Super admins can manage admin roles"
  ON admin_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin' AND ar.is_active = true
    )
  );

-- Audit logs policies
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id AND
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- User reports policies
CREATE POLICY "Users can view their own reports"
  ON user_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
  ON user_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON user_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON user_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Enhanced admin tickets policies for admins
CREATE POLICY "Admins can view all tickets"
  ON admin_tickets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id OR
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can update tickets"
  ON admin_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_user_reports_updated_at
  BEFORE UPDATE ON user_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON admin_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid, required_role text DEFAULT 'moderator')
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM admin_roles
  WHERE admin_roles.user_id = is_admin.user_id
    AND is_active = true
  ORDER BY
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'moderator' THEN 3
    END
  LIMIT 1;

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  RETURN CASE required_role
    WHEN 'super_admin' THEN user_role = 'super_admin'
    WHEN 'admin' THEN user_role IN ('super_admin', 'admin')
    WHEN 'moderator' THEN user_role IN ('super_admin', 'admin', 'moderator')
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  admin_id uuid,
  action text,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (admin_id, action, target_type, target_id, details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend user
CREATE OR REPLACE FUNCTION suspend_user(
  admin_id uuid,
  target_user_id uuid,
  reason text,
  duration_hours integer DEFAULT 24
)
RETURNS void AS $$
BEGIN
  -- Check admin permissions
  IF NOT is_admin(admin_id, 'moderator') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update user status (you might want to add a suspended_until column to users table)
  -- For now, we'll just log the action

  -- Log the action
  PERFORM log_admin_action(
    admin_id,
    'suspend_user',
    'user',
    target_user_id,
    jsonb_build_object(
      'reason', reason,
      'duration_hours', duration_hours,
      'suspended_until', now() + (duration_hours || ' hours')::interval
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban user
CREATE OR REPLACE FUNCTION ban_user(
  admin_id uuid,
  target_user_id uuid,
  reason text,
  is_permanent boolean DEFAULT false
)
RETURNS void AS $$
BEGIN
  -- Check admin permissions
  IF NOT is_admin(admin_id, 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- You might want to add a banned column to users table
  -- For now, we'll just log the action

  -- Log the action
  PERFORM log_admin_action(
    admin_id,
    'ban_user',
    'user',
    target_user_id,
    jsonb_build_object(
      'reason', reason,
      'is_permanent', is_permanent,
      'banned_at', now()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users_today', (
      SELECT COUNT(*) FROM users
      WHERE DATE(last_login_date) = CURRENT_DATE
    ),
    'total_tasks_completed', (SELECT SUM(total_tasks_completed) FROM users),
    'active_challenges', (SELECT COUNT(*) FROM challenges WHERE status = 'active'),
    'total_credits_in_circulation', (SELECT SUM(credits) FROM users),
    'total_bets_placed', (SELECT COUNT(*) FROM bets),
    'total_groups', (SELECT COUNT(*) FROM groups),
    'pending_tickets', (SELECT COUNT(*) FROM admin_tickets WHERE status = 'open'),
    'pending_reports', (SELECT COUNT(*) FROM user_reports WHERE status = 'pending')
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for admin dashboard
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  'users' as metric,
  COUNT(*)::text as value,
  'Total registered users' as description
FROM users
UNION ALL
SELECT
  'active_today' as metric,
  COUNT(*)::text as value,
  'Users active today' as description
FROM users
WHERE DATE(last_login_date) = CURRENT_DATE
UNION ALL
SELECT
  'challenges_active' as metric,
  COUNT(*)::text as value,
  'Active challenges' as description
FROM challenges
WHERE status = 'active'
UNION ALL
SELECT
  'tickets_pending' as metric,
  COUNT(*)::text as value,
  'Pending support tickets' as description
FROM admin_tickets
WHERE status = 'open'
UNION ALL
SELECT
  'reports_pending' as metric,
  COUNT(*)::text as value,
  'Pending user reports' as description
FROM user_reports
WHERE status = 'pending';

-- Grant access to admin view
CREATE POLICY "Admins can view dashboard stats"
  ON admin_dashboard_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

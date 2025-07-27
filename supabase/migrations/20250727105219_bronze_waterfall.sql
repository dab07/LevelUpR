/*
  # Create tasks table for daily task management

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `title` (text)
      - `description` (text, optional)
      - `is_daily` (boolean, default true)
      - `is_completed` (boolean, default false)
      - `completed_at` (timestamptz, optional)
      - `credit_reward` (integer, default 1)
      - `due_date` (timestamptz)
      - `category` (text, enum-like)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for users to manage their own tasks

  3. Constraints
    - Limit daily tasks to 5 per user per day
    - Ensure valid categories
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) > 0 AND length(title) <= 200),
  description text CHECK (length(description) <= 1000),
  is_daily boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  credit_reward integer DEFAULT 1 CHECK (credit_reward > 0),
  due_date timestamptz NOT NULL,
  category text NOT NULL CHECK (category IN ('personal', 'fitness', 'work', 'study', 'other')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_daily ON tasks(is_daily);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Function to check daily task limit
CREATE OR REPLACE FUNCTION check_daily_task_limit()
RETURNS trigger AS $$
DECLARE
  task_count integer;
BEGIN
  IF NEW.is_daily THEN
    SELECT COUNT(*)
    INTO task_count
    FROM tasks
    WHERE user_id = NEW.user_id
      AND is_daily = true
      AND DATE(created_at) = DATE(NEW.created_at);
    
    IF task_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 daily tasks allowed per day';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily task limit
CREATE TRIGGER check_daily_task_limit_trigger
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION check_daily_task_limit();
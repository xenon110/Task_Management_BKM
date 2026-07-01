-- ============================================================================
-- Inbox Notification System Fix – Non-Breaking Database Migration
-- ============================================================================
-- Run this SQL script in your Supabase SQL Editor to apply the fix.
-- This script updates RLS policies to use email mapping (resolving ID mismatches)
-- and installs a PostgreSQL trigger to handle task assignment notifications.
-- ============================================================================

-- 1. DROP EXISTING POLICIES ON THE NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated notification inserts" ON notifications;

-- 2. CREATE NEW EMAIL-BASED RLS POLICIES FOR SECURE CLIENT-SIDE READ/UPDATE/DELETE
-- Instead of matching notifications.user_id directly to auth.uid(), we match the email of the
-- user record to the authenticated user's email. This resolves the database vs auth ID mismatch.
CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE email = auth.email()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE email = auth.email()
    )
  );

-- Enable RLS on notifications (if not already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. CREATE TRIGGER FUNCTION FOR SECURE SERVER-SIDE NOTIFICATION CREATION
-- Runs as SECURITY DEFINER to bypass client RLS limits when inserting.
-- Inserts a notification when a task is created or updated with a new assignee.
CREATE OR REPLACE FUNCTION create_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
BEGIN
  -- Get the name of the user who created/assigned the task
  SELECT name INTO creator_name FROM users WHERE id = NEW.created_by;
  IF creator_name IS NULL THEN
    creator_name := 'Someone';
  END IF;

  -- Trigger if assignee is set and is NOT the creator themselves
  IF (TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL AND NEW.assignee_id <> NEW.created_by) OR 
     (TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id <> NEW.assignee_id) AND NEW.assignee_id <> NEW.created_by) THEN
    
    INSERT INTO notifications (user_id, type, title, message, read, starred, link, created_at)
    VALUES (
      NEW.assignee_id,
      'task_assigned',
      'New Task Assignment',
      creator_name || ' assigned you a task: ' || NEW.title,
      false,
      false,
      NEW.id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. BIND THE TRIGGER TO THE TASKS TABLE
DROP TRIGGER IF EXISTS tr_task_assigned ON tasks;
CREATE TRIGGER tr_task_assigned
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_assignment_notification();

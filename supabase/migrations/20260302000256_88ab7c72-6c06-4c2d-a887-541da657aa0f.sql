
CREATE TABLE public.conversation_locks (
  sender_id TEXT PRIMARY KEY,
  instance_name TEXT NOT NULL,
  processing BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.conversation_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage conversation locks"
  ON public.conversation_locks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to acquire lock atomically (returns true if acquired)
CREATE OR REPLACE FUNCTION public.acquire_sender_lock(p_sender_id TEXT, p_instance_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  lock_acquired BOOLEAN := FALSE;
BEGIN
  -- Try to insert a new lock
  INSERT INTO conversation_locks (sender_id, instance_name, processing, locked_at, updated_at)
  VALUES (p_sender_id, p_instance_name, TRUE, now(), now())
  ON CONFLICT (sender_id) DO UPDATE
    SET processing = TRUE, locked_at = now(), updated_at = now()
    WHERE conversation_locks.processing = FALSE
       OR conversation_locks.updated_at < now() - interval '2 minutes';
  
  -- Check if we actually got the lock
  SELECT processing INTO lock_acquired
  FROM conversation_locks
  WHERE sender_id = p_sender_id
    AND locked_at >= now() - interval '1 second';
  
  RETURN COALESCE(lock_acquired, FALSE);
END;
$$;

-- Function to release lock
CREATE OR REPLACE FUNCTION public.release_sender_lock(p_sender_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE conversation_locks
  SET processing = FALSE, updated_at = now()
  WHERE sender_id = p_sender_id;
END;
$$;

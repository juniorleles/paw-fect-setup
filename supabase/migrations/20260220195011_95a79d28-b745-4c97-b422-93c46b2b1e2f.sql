
-- Create conversation history table for WhatsApp chat memory
CREATE TABLE public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by phone within a shop
CREATE INDEX idx_conversation_messages_lookup ON public.conversation_messages (user_id, phone, created_at DESC);

-- Auto-cleanup: delete messages older than 24 hours to keep table small
-- We'll handle this in the edge function instead

-- Enable RLS
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role)
-- No user-facing policies needed since this is only accessed by edge functions via service role key

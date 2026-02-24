
CREATE POLICY "Users can view their own conversation messages"
ON public.conversation_messages
FOR SELECT
USING (auth.uid() = user_id);

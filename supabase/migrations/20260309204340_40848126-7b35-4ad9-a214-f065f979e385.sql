-- Create storage bucket for customer media (images from WhatsApp)
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-media', 'customer-media', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to insert files
CREATE POLICY "Service can upload media"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'customer-media' AND
  (has_role(auth.uid(), 'admin'::app_role) OR current_setting('role', true) = 'service_role')
);

-- Allow authenticated users to view their own media (path starts with their user_id)
CREATE POLICY "Users can view own media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all media
CREATE POLICY "Admins can view all media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-media' AND
  has_role(auth.uid(), 'admin'::app_role)
);
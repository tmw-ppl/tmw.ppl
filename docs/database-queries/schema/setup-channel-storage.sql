-- Storage bucket setup for channel file uploads (images, videos, files)
-- Run this in Supabase dashboard under Storage

-- Note: These commands need to be run in Supabase SQL editor or via Supabase client
-- Create storage bucket for channel attachments
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('channel-attachments', 'channel-attachments', true);

-- Storage policies for channel attachments
-- Anyone authenticated can upload
-- CREATE POLICY "Authenticated users can upload channel attachments" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'channel-attachments' AND
--     auth.role() = 'authenticated'
--   );

-- Anyone can view/download attachments
-- CREATE POLICY "Anyone can view channel attachments" ON storage.objects
--   FOR SELECT USING (bucket_id = 'channel-attachments');

-- Users can delete their own uploads or admins can delete any
-- CREATE POLICY "Users can delete own uploads" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'channel-attachments' AND
--     (auth.uid()::text = (storage.foldername(name))[1])
--   );

SELECT 'Channel storage setup - run these in Supabase Storage dashboard' as note;

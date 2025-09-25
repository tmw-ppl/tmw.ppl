-- Setup Supabase Storage for Project Images
-- Run these commands in your Supabase SQL editor

-- Create storage bucket for project images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for project images
CREATE POLICY "Anyone can view project images" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can upload project images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own project images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own project images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'project-images';

-- Note: You may also want to set up CORS in the Supabase dashboard
-- if you plan to upload images directly from the client

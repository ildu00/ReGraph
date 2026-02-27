
-- Create claw-images bucket for storing agent-generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('claw-images', 'claw-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to claw-images
CREATE POLICY "Authenticated users can upload claw images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'claw-images' AND auth.uid() IS NOT NULL);

-- Allow public read access to claw images
CREATE POLICY "Public read access for claw images"
ON storage.objects FOR SELECT
USING (bucket_id = 'claw-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own claw images"
ON storage.objects FOR DELETE
USING (bucket_id = 'claw-images' AND auth.uid() IS NOT NULL);

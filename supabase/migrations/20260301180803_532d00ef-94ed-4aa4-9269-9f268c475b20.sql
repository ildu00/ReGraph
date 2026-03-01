
-- Allow authenticated users to upload files to claw-images bucket
CREATE POLICY "Authenticated users can upload to claw-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'claw-images');

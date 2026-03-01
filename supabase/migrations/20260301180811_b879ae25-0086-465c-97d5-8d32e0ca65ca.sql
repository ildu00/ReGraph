
-- Allow anyone to read from claw-images bucket (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can read claw-images'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read claw-images" ON storage.objects FOR SELECT USING (bucket_id = ''claw-images'')';
  END IF;
END$$;

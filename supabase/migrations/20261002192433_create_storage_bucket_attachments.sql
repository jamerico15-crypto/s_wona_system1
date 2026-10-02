/*
# Create storage bucket for attachments (logos)

1. Storage
- Create 'attachments' bucket (public) for logo uploads and other file attachments
- Allow public read access
- Allow authenticated users to upload

2. Notes
- The bucket is public so logos can be displayed without auth tokens
- Upload is restricted to authenticated users via storage policies
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_attachments" ON storage.objects;
CREATE POLICY "public_read_attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "authenticated_upload_attachments" ON storage.objects;
CREATE POLICY "authenticated_upload_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "authenticated_update_attachments" ON storage.objects;
CREATE POLICY "authenticated_update_attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid())
WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "authenticated_delete_attachments" ON storage.objects;
CREATE POLICY "authenticated_delete_attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments' AND owner = auth.uid());

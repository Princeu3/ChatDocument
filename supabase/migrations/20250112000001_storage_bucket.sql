-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-files',
    'chat-files',
    true,
    26214400, -- 25MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policy to allow public access to chat-files bucket
CREATE POLICY "Allow public read access to chat-files" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-files');

CREATE POLICY "Allow public insert access to chat-files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Allow public update access to chat-files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'chat-files');

CREATE POLICY "Allow public delete access to chat-files" ON storage.objects
    FOR DELETE USING (bucket_id = 'chat-files');

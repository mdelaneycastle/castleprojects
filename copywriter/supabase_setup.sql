-- CopyWriter V2 - Supabase Schema Setup
-- Paste this into the Supabase SQL Editor and run it.
-- Dashboard: https://supabase.com/dashboard → SQL Editor

-- 1. Artists
CREATE TABLE artists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Style guides (one per artist)
CREATE TABLE style_guides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE UNIQUE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Documents (metadata + extracted text)
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT,
    extracted_text TEXT,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS (required by Supabase)
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 5. Allow all operations via anon key (internal tool, trusted users only)
CREATE POLICY "Allow all on artists" ON artists FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on style_guides" ON style_guides FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on documents" ON documents FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. Storage bucket for original document files
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- 7. Storage policies
CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Allow reads" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'documents');
CREATE POLICY "Allow deletes" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'documents');

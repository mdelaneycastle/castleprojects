-- Run this in the Supabase SQL Editor to add the generated copy table.

CREATE TABLE generated_copy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    user_brief TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE generated_copy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on generated_copy" ON generated_copy FOR ALL TO anon USING (true) WITH CHECK (true);

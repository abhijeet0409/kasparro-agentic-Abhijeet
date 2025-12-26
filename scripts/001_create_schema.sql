-- Create tables for the multi-agent content generation system

-- Table to store product data
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  concentration TEXT,
  skin_type TEXT[],
  key_ingredients TEXT[],
  benefits TEXT[],
  how_to_use TEXT,
  side_effects TEXT,
  price TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store generated questions
CREATE TABLE IF NOT EXISTS generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store generated pages
CREATE TABLE IF NOT EXISTS generated_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL, -- 'faq', 'product', 'comparison'
  content JSONB NOT NULL,
  agent_metadata JSONB, -- stores which agents were involved, tokens used, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store agent execution logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store comparison products (fictional Product B)
CREATE TABLE IF NOT EXISTS comparison_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  concentration TEXT,
  key_ingredients TEXT[],
  benefits TEXT[],
  price TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_products ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a demo)
-- In production, you'd tie these to auth.uid()
CREATE POLICY "Allow public read access on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert on products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on products" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on products" ON products FOR DELETE USING (true);

CREATE POLICY "Allow public read access on questions" ON generated_questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on questions" ON generated_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on questions" ON generated_questions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on questions" ON generated_questions FOR DELETE USING (true);

CREATE POLICY "Allow public read access on pages" ON generated_pages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on pages" ON generated_pages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on pages" ON generated_pages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on pages" ON generated_pages FOR DELETE USING (true);

CREATE POLICY "Allow public read access on logs" ON agent_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on logs" ON agent_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on comparison" ON comparison_products FOR SELECT USING (true);
CREATE POLICY "Allow public insert on comparison" ON comparison_products FOR INSERT WITH CHECK (true);

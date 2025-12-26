-- Add generation tracking to group pages from the same generation run

-- Add generation_id to generated_pages table
ALTER TABLE generated_pages 
ADD COLUMN IF NOT EXISTS generation_id UUID NOT NULL DEFAULT gen_random_uuid();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generated_pages_generation_id ON generated_pages(generation_id);
CREATE INDEX IF NOT EXISTS idx_generated_pages_product_id ON generated_pages(product_id);
CREATE INDEX IF NOT EXISTS idx_generated_pages_created_at ON generated_pages(created_at DESC);

-- Add generation_id to generated_questions table
ALTER TABLE generated_questions
ADD COLUMN IF NOT EXISTS generation_id UUID;

-- Create index for questions
CREATE INDEX IF NOT EXISTS idx_generated_questions_generation_id ON generated_questions(generation_id);

-- Update agent_logs to link to generation_id instead of just execution_id
ALTER TABLE agent_logs
ADD COLUMN IF NOT EXISTS generation_id UUID;

CREATE INDEX IF NOT EXISTS idx_agent_logs_generation_id ON agent_logs(generation_id);

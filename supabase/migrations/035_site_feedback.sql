-- Site feedback: allow anyone to submit; only service role / admin reads
CREATE TABLE public.site_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  category TEXT CHECK (category IN ('bug', 'idea', 'general', 'design')),
  email TEXT,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_site_feedback_created_at ON public.site_feedback(created_at DESC);

ALTER TABLE public.site_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert feedback
CREATE POLICY "Anyone can submit feedback"
  ON public.site_feedback FOR INSERT
  WITH CHECK (true);

-- No SELECT policy for anon; only service role (bypasses RLS) can read in admin.

COMMENT ON TABLE public.site_feedback IS 'User feedback from the public site; insert-only for anon.';

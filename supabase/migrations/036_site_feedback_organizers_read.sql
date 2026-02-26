-- Allow organizers to read site_feedback (for admin feedback page)
CREATE POLICY "Organizers can read site feedback"
  ON public.site_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.user_id = auth.uid()
    )
  );

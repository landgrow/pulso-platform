CREATE TABLE IF NOT EXISTS public.staff_canvas_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id uuid NOT NULL REFERENCES public.staff_canvases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_canvas_comments_canvas
  ON public.staff_canvas_comments (canvas_id, created_at);
ALTER TABLE public.staff_canvas_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_canvas_comments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_canvas_comments_all ON public.staff_canvas_comments;
CREATE POLICY staff_canvas_comments_all ON public.staff_canvas_comments
  FOR ALL USING (public.staff_can('sala')) WITH CHECK (public.staff_can('sala'));
GRANT SELECT, INSERT, DELETE ON public.staff_canvas_comments TO authenticated;

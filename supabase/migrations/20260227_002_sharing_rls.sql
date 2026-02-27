-- Additional RLS policies for project sharing
-- Note: base policies (projects SELECT, project_shares SELECT) already exist.
-- These add INSERT/UPDATE/DELETE for project owners on shares,
-- and scene editing for shared collaborators.

-- Allow project owners to INSERT shares
CREATE POLICY "Owners can create shares"
  ON public.project_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_shares.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- Allow project owners to UPDATE shares
CREATE POLICY "Owners can update shares"
  ON public.project_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_shares.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- Allow project owners to DELETE shares
CREATE POLICY "Owners can delete shares"
  ON public.project_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_shares.project_id
        AND projects.owner_id = auth.uid()
    )
  );

-- Allow shared users with edit/admin permission to manage scenes
CREATE POLICY "Editors can manage shared project scenes"
  ON public.scenes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.project_shares ps
      JOIN public.projects p ON p.id = ps.project_id
      WHERE ps.project_id = scenes.project_id
        AND ps.shared_with_id = auth.uid()
        AND ps.permission IN ('edit', 'admin')
    )
  );

CREATE POLICY "No direct access to access keys"
ON public.access_keys FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);
CREATE POLICY "No direct access to saved profiles"
ON public.saved_profiles FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);
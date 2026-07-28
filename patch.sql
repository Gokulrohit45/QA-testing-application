-- 1. Create a patch schema script to loosen RLS policies for testing
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.test_cases;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.executions;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.execution_logs;

-- Apply permissive policies for ALL public traffic (temporary development support)
CREATE POLICY "Allow public access" ON public.projects FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.test_cases FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.executions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.execution_logs FOR ALL TO public USING (true) WITH CHECK (true);

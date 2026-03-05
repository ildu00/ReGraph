
CREATE OR REPLACE FUNCTION public.get_total_spent_for_user(user_id_param UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(SUM(cost_usd), 0)
  FROM public.usage_logs
  WHERE user_id = user_id_param;
$$;


-- Function to get city summary counts for door knocking
CREATE OR REPLACE FUNCTION public.get_door_knocking_cities(p_user_id uuid)
RETURNS TABLE(city text, voter_count bigint, contacted_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.city,
    COUNT(*)::bigint AS voter_count,
    COUNT(d.id) FILTER (WHERE d.status IS NOT NULL AND d.status <> 'not_visited')::bigint AS contacted_count
  FROM voters v
  LEFT JOIN door_knocking_logs d ON d.voter_id = v.id AND d.user_id = p_user_id
  WHERE v.user_id = p_user_id AND v.city IS NOT NULL AND v.city <> ''
  GROUP BY v.city
  ORDER BY v.city;
$$;
